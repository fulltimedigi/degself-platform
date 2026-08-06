import { NextRequest, NextResponse } from "next/server";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendAdminWhatsApp } from "@/lib/callmebot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/quotes — RFQ (Phase 0). Car owner submits a request for quotes; the
// founder routes it to matched garages manually over WhatsApp. Server-only writes
// via the service-role key. Customer phone is PII and never surfaced to garages.

const URGENCY = ["عادي", "مستعجل", "طارئ"] as const;
const SOURCES = ["quote_bar", "translator", "asaali", "concierge"] as const;
const RATE_LIMIT_PER_HOUR = 5;

type MatchedWorkshop = {
  place_id: string;
  name: string;
  phone?: string;
};

function parseMatchedWorkshops(raw: unknown): MatchedWorkshop[] {
  if (!Array.isArray(raw)) return [];
  const out: MatchedWorkshop[] = [];
  for (const item of raw.slice(0, 8)) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const place_id =
      typeof o.place_id === "string"
        ? o.place_id.trim()
        : typeof o.id === "string"
          ? o.id.trim()
          : "";
    const name = typeof o.name === "string" ? o.name.trim().slice(0, 120) : "";
    if (!place_id || !name) continue;
    const phone =
      typeof o.phone === "string" ? o.phone.trim().slice(0, 30) : undefined;
    out.push(phone ? { place_id, name, phone } : { place_id, name });
  }
  return out;
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

export async function POST(req: NextRequest) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  // honeypot — bots fill hidden fields. Pretend success, drop silently.
  if (typeof b.website === "string" && b.website.trim() !== "") {
    return NextResponse.json({ id: null, status: "received", message: "وصلنا طلبك." });
  }

  // ---- validation (manual, str() style — matches the rest of the repo) ----
  const customer_name = str(b.customer_name, 60);
  if (!customer_name || customer_name.length < 2) {
    return NextResponse.json({ error: "اكتب اسمك (حرفين على الأقل)." }, { status: 400 });
  }
  const customer_phone = str(b.customer_phone, 15);
  if (!customer_phone || !/^[0-9+\s-]{7,15}$/.test(customer_phone)) {
    return NextResponse.json({ error: "اكتب رقم واتساب صحيح." }, { status: 400 });
  }
  const service = str(b.service, 60);
  if (!service || service.length < 2) {
    return NextResponse.json({ error: "اختر نوع الخدمة." }, { status: 400 });
  }
  const problem_description = str(b.problem_description, 1000);
  if (!problem_description || problem_description.length < 10) {
    return NextResponse.json({ error: "اشرح المشكلة (١٠ أحرف على الأقل)." }, { status: 400 });
  }

  const urgencyRaw = str(b.urgency, 10) ?? "عادي";
  const urgency = (URGENCY as readonly string[]).includes(urgencyRaw) ? urgencyRaw : "عادي";
  const sourceRaw = str(b.source, 20) ?? "quote_bar";
  const source = (SOURCES as readonly string[]).includes(sourceRaw) ? sourceRaw : "quote_bar";

  let photos: string[] = [];
  if (Array.isArray(b.photos)) {
    photos = b.photos
      .filter((p): p is string => typeof p === "string" && p.trim() !== "")
      .slice(0, 3)
      .map((p) => p.trim().slice(0, 600));
  }

  const car_make = str(b.car_make, 60);
  if (!car_make) {
    return NextResponse.json({ error: "اكتب نوع السيارة." }, { status: 400 });
  }
  const car_model = str(b.car_model, 60);
  if (!car_model) {
    return NextResponse.json({ error: "اكتب موديل السيارة." }, { status: 400 });
  }
  const car_year = str(b.car_year, 20);
  if (!car_year) {
    return NextResponse.json({ error: "اختر سنة الصنع." }, { status: 400 });
  }
  const area = str(b.area, 120);

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "النظام غير مهيأ." }, { status: 500 });
  }

  // ---- anti-spam: same phone within 30 minutes (before IP quota) ----
  try {
    const since = new Date(Date.now() - 30 * 60_000).toISOString();
    const { data: dup } = await admin
      .from("quotes")
      .select("id")
      .eq("customer_phone", customer_phone)
      .gte("created_at", since)
      .limit(1);
    if (dup && dup.length > 0) {
      return NextResponse.json(
        { error: "أرسلت طلباً قبل قليل — انتظر قليلاً قبل إرسال طلب جديد." },
        { status: 429 }
      );
    }
  } catch (e) {
    console.error("duplicate-phone check failed (allowing):", e);
  }

  // ---- rate limit: atomic bump via bump_rate_limit RPC ----
  const ip = clientIp(req);
  if (!(await consumeRateLimit(ip, "quotes", RATE_LIMIT_PER_HOUR))) {
    return NextResponse.json({ error: "طلبات كثيرة، حاول بعد ساعة." }, { status: 429 });
  }

  const matched_workshops = parseMatchedWorkshops(b.matched_workshops);

  // ---- insert ----
  const { data: inserted, error } = await admin
    .from("quotes")
    .insert({
      customer_name,
      customer_phone,
      service,
      car_make,
      car_model,
      car_year,
      problem_description,
      area,
      urgency,
      photos,
      source,
      matched_workshops,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("quotes insert error:", error);
    return NextResponse.json({ error: "تعذر حفظ طلبك، حاول لاحقاً." }, { status: 500 });
  }

  // ---- notify admin over WhatsApp (fire-and-forget) ----
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://degself.com";
  const lines = [
    "🔔 طلب عرض سعر جديد — دق سلف",
    "",
    `👤 ${customer_name} | ${customer_phone}`,
    `⚙️ الخدمة: ${service}`,
    `📝 ${problem_description}`,
  ];
  if (car_make || car_model || car_year) {
    lines.push(`🚗 ${[car_make, car_model, car_year].filter(Boolean).join(" ")}`);
  }
  if (area) lines.push(`📍 ${area}`);
  lines.push(`⏱️ الإلحاح: ${urgency}`);
  lines.push(`📎 المصدر: ${source}`);
  if (matched_workshops.length > 0) {
    lines.push(
      `🤝 مرشّحون: ${matched_workshops.map((w) => w.name).join(" · ")}`
    );
  }
  lines.push("");
  lines.push(`🔗 ${siteUrl}/admin/quotes/${inserted.id}`);
  // Notify admin over WhatsApp. MUST be awaited — a non-awaited (fire-and-forget)
  // call is frozen by the serverless runtime after the response and never
  // completes, so the message would never send. A notify failure must not fail
  // the request (the quote is already saved), so swallow errors here.
  try {
    await sendAdminWhatsApp(lines.join("\n"));
  } catch (e) {
    console.error("CallMeBot notify failed:", e);
  }

  return NextResponse.json({
    id: inserted.id,
    status: "received",
    message: "وصلنا طلبك — بنرسله لكراجات مختصة وتوصلك العروض قريباً.",
  });
}
