import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// best-effort in-memory rate limit (per serverless instance)
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

/** POST /api/reviews — submit an anonymous review (stored as 'pending'). */
export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "محاولات كثيرة، حاول بعد قليل." }, { status: 429 });
  }

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  // honeypot — bots fill hidden fields; silently accept and drop
  if (typeof b.website === "string" && b.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const place_id = typeof b.place_id === "string" ? b.place_id.trim() : "";
  const rating = Number(b.rating);
  const body = typeof b.body === "string" ? b.body.trim() : "";
  const author_name =
    typeof b.name === "string" && b.name.trim() ? b.name.trim().slice(0, 60) : null;

  if (!place_id) return NextResponse.json({ error: "الكراج غير محدّد." }, { status: 400 });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return NextResponse.json({ error: "اختر تقييماً من 1 إلى 5 نجوم." }, { status: 400 });
  if (body.length < 3 || body.length > 1000)
    return NextResponse.json({ error: "اكتب مراجعة بين 3 و1000 حرف." }, { status: 400 });

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "خدمة التقييمات غير مهيّأة حالياً." }, { status: 503 });
  }

  // the workshop must exist (place_id is case-sensitive)
  const { data: w, error: wErr } = await supabaseAdmin
    .from("workshops")
    .select("place_id")
    .eq("place_id", place_id)
    .maybeSingle();
  if (wErr) return NextResponse.json({ error: "تعذّر التحقق من الكراج حالياً." }, { status: 503 });
  if (!w) return NextResponse.json({ error: "الكراج غير موجود." }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("reviews")
    .insert({ place_id, rating, body, author_name, status: "pending" });
  if (error) return NextResponse.json({ error: "تعذّر حفظ التقييم." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
