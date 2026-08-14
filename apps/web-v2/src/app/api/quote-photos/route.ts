import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public endpoint: a car owner uploads photos documenting the fault while filling
// the quote form (no auth — they aren't logged in). Abuse is bounded by a strict
// per-IP hourly cap, a hard size/type gate, and a random object path. The returned
// public URL is what the form sends back in `quotes.photos`.
const BUCKET = "quote-media";
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const UPLOADS_PER_HOUR = 20; // ~3 photos/quote + retries, well above normal use
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function ensureBucket(admin: ReturnType<typeof getSupabaseAdmin>) {
  const { data } = await admin.storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_FILE_BYTES,
    allowedMimeTypes: Object.keys(MIME_EXT),
  });
  if (error && !/already exists/i.test(error.message)) throw error;
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!(await consumeRateLimit(ip, "quote-photos", UPLOADS_PER_HOUR, { failClosed: true }))) {
    return NextResponse.json({ error: "صور كثيرة، حاول بعد قليل." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "ملف غير صالح." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "اختر صورة للرفع." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "حجم الصورة يجب ألا يتجاوز 5MB." }, { status: 400 });
  }
  const ext = MIME_EXT[file.type];
  if (!ext) {
    return NextResponse.json({ error: "المسموح JPG أو PNG أو WEBP فقط." }, { status: 400 });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "النظام غير مهيأ." }, { status: 500 });
  }

  try {
    await ensureBucket(admin);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "تعذّر تجهيز التخزين." },
      { status: 500 }
    );
  }

  // Date-prefixed random path — no user identifier, and easy to sweep orphans by day.
  const day = new Date().toISOString().slice(0, 10);
  const path = `${day}/${Date.now()}-${randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: publicData.publicUrl });
}
