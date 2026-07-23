import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { validateOffer } from "@/lib/offer-validation";
import { sendAdminWhatsApp } from "@/lib/callmebot";
import { clientIp, isOverLimit, recordHit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stop one link from being used to flood a request with offers.
const MAX_OFFERS_PER_QUOTE = 30;
// Per-IP hourly cap so a forwarded link can't spam inserts + admin notifications.
const MAX_OFFERS_PER_IP_HOUR = 10;

// POST /api/submit-offer/[token] — PUBLIC (garage-facing, token-gated, no login).
// A workshop submits its own structured offer for a quote. Validation is
// AUTHORITATIVE here (same rules as the admin path + DB CHECK constraints).
// Customer PII is never read or returned.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "رابط غير صالح." }, { status: 400 });

  const ip = clientIp(req);
  if (await isOverLimit(ip, "garage_offer", MAX_OFFERS_PER_IP_HOUR)) {
    return NextResponse.json({ error: "عروض كثيرة — حاول بعد ساعة." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const result = validateOffer(body);
  if (result.errors) {
    const firstError = Object.values(result.errors)[0] ?? "بيانات العرض غير صحيحة.";
    return NextResponse.json({ error: firstError, fields: result.errors }, { status: 400 });
  }
  const offer = result.value;

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "النظام غير مهيأ." }, { status: 500 });
  }

  // Resolve the quote from the garage token (no PII selected).
  const { data: quote, error: qErr } = await admin
    .from("quotes")
    .select("id,service,status")
    .eq("garage_token", token)
    .maybeSingle();
  if (qErr) {
    console.error("submit-offer fetch quote error:", qErr);
    return NextResponse.json({ error: "تعذّر جلب الطلب." }, { status: 500 });
  }
  if (!quote) return NextResponse.json({ error: "الرابط غير صحيح." }, { status: 404 });

  if (quote.status === "accepted") {
    return NextResponse.json({ error: "تم إغلاق هذا الطلب — اختار العميل عرضاً بالفعل." }, { status: 409 });
  }
  if (quote.status === "expired") {
    return NextResponse.json({ error: "انتهت صلاحية هذا الطلب." }, { status: 410 });
  }

  // Cap total offers so a leaked link can't flood the request.
  const { count } = await admin
    .from("quote_offers")
    .select("id", { count: "exact", head: true })
    .eq("quote_id", quote.id);
  if ((count ?? 0) >= MAX_OFFERS_PER_QUOTE) {
    return NextResponse.json({ error: "وصل هذا الطلب للحد الأقصى من العروض." }, { status: 429 });
  }

  const { error: insErr } = await admin.from("quote_offers").insert({
    quote_id: quote.id,
    workshop_name: offer.workshop_name,
    workshop_phone: offer.workshop_phone,
    pricing_type: offer.pricing_type,
    price_kwd: offer.price_kwd,
    price_max_kwd: offer.price_max_kwd,
    assumed_diagnosis: offer.assumed_diagnosis,
    inspection_fee_kwd: offer.inspection_fee_kwd,
    parts_type: offer.parts_type,
    validity_days: offer.validity_days,
    warranty_days: offer.warranty_days,
    warranty_note: offer.warranty_note,
    estimated_duration: offer.estimated_duration,
    notes: offer.notes,
  });
  if (insErr) {
    console.error("submit-offer insert error:", insErr);
    return NextResponse.json({ error: "تعذّر حفظ العرض." }, { status: 500 });
  }

  // Count this accepted submission against the per-IP hourly budget.
  await recordHit(ip, "garage_offer");

  // Let the founder know a garage responded (must be awaited on serverless).
  try {
    await sendAdminWhatsApp(
      `🧰 عرض جديد من كراج على طلب: ${quote.service}\n` +
        `الكراج: ${offer.workshop_name} — ${offer.price_kwd} د.ك`
    );
  } catch (e) {
    console.error("submit-offer notify failed:", e);
  }

  return NextResponse.json({ success: true });
}
