import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "workshop-media";
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_GALLERY = 8;
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

async function requirePartner(admin: ReturnType<typeof getSupabaseAdmin>, placeId: string) {
  const { data, error } = await admin
    .from("workshops")
    .select("place_id,is_partner")
    .eq("place_id", placeId)
    .maybeSingle();
  if (error) throw error;
  return data?.is_partner === true;
}

async function mirrorMedia(
  admin: ReturnType<typeof getSupabaseAdmin>,
  placeId: string,
  hero: string | null,
  gallery: string[]
) {
  const { error } = await admin
    .from("workshops")
    .update({
      main_image: hero,
      images_count: gallery.length,
      updated_at: new Date().toISOString(),
    })
    .eq("place_id", placeId);
  if (error) throw error;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ place_id: string }> }
) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }
  const { place_id } = await params;
  const admin = getSupabaseAdmin();
  if (!(await requirePartner(admin, place_id))) {
    return NextResponse.json({ error: "رفع الصور متاح لكراجات الشبكة فقط." }, { status: 404 });
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

  const { data: current } = await admin
    .from("workshop_profile_overrides")
    .select("hero_image_url,gallery_image_urls")
    .eq("place_id", place_id)
    .maybeSingle();
  const gallery = Array.isArray(current?.gallery_image_urls)
    ? (current.gallery_image_urls as string[])
    : [];
  if (gallery.length >= MAX_GALLERY) {
    return NextResponse.json({ error: `الحد الأقصى ${MAX_GALLERY} صور للكراج.` }, { status: 409 });
  }

  await ensureBucket(admin);
  const path = `${place_id}/${Date.now()}-${randomUUID()}.${ext}`;
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
  const url = publicData.publicUrl;
  const nextGallery = [...gallery, url];
  const hero = current?.hero_image_url || url;

  const { error: dbError } = await admin.from("workshop_profile_overrides").upsert(
    {
      place_id,
      hero_image_url: hero,
      gallery_image_urls: nextGallery,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "place_id" }
  );
  if (dbError) {
    await admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }
  try {
    await mirrorMedia(admin, place_id, hero, nextGallery);
  } catch (e) {
    await admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "تعذّر تحديث صورة الكراج." },
      { status: 500 }
    );
  }
  return NextResponse.json({ url, hero_image_url: hero, gallery_image_urls: nextGallery });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ place_id: string }> }
) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }
  const { place_id } = await params;
  const admin = getSupabaseAdmin();
  if (!(await requirePartner(admin, place_id))) {
    return NextResponse.json({ error: "الكراج غير موجود في الشبكة." }, { status: 404 });
  }
  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }
  if (typeof body.url !== "string") {
    return NextResponse.json({ error: "رابط الصورة مطلوب." }, { status: 400 });
  }

  const { data: current, error } = await admin
    .from("workshop_profile_overrides")
    .select("hero_image_url,gallery_image_urls")
    .eq("place_id", place_id)
    .maybeSingle();
  if (error || !current) {
    return NextResponse.json({ error: error?.message ?? "لا توجد صور." }, { status: 404 });
  }
  const gallery = Array.isArray(current.gallery_image_urls)
    ? (current.gallery_image_urls as string[])
    : [];
  if (!gallery.includes(body.url)) {
    return NextResponse.json({ error: "الصورة غير مرتبطة بهذا الكراج." }, { status: 404 });
  }

  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = body.url.indexOf(marker);
  if (idx >= 0) {
    const path = decodeURIComponent(body.url.slice(idx + marker.length));
    if (path.startsWith(`${place_id}/`)) await admin.storage.from(BUCKET).remove([path]);
  }
  const nextGallery = gallery.filter((u) => u !== body.url);
  const nextHero = current.hero_image_url === body.url ? nextGallery[0] ?? null : current.hero_image_url;
  const { error: updateError } = await admin
    .from("workshop_profile_overrides")
    .update({
      hero_image_url: nextHero,
      gallery_image_urls: nextGallery,
      updated_at: new Date().toISOString(),
    })
    .eq("place_id", place_id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  try {
    await mirrorMedia(admin, place_id, nextHero, nextGallery);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "تعذّر تحديث صورة الكراج." },
      { status: 500 }
    );
  }
  return NextResponse.json({ hero_image_url: nextHero, gallery_image_urls: nextGallery });
}
