import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveGarageOutreachToken } from "@/lib/garage-outreach";
import { validateOffer } from "@/lib/offer-validation";
import { sendAdminWhatsApp } from "@/lib/callmebot";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_OFFERS_PER_QUOTE = 30;
const MAX_OFFERS_PER_IP_HOUR = 10;

// POST /api/submit-offer/[token] — PUBLIC (garage-facing, token-gated, no login).
// For measured per-workshop links, workshop identity is authoritative from the
// capability token and canonical workshops table. Client-supplied workshop name/
// phone are ignored, preventing one garage from impersonating another.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "رابط غير صالح." }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const ip = clientIp(req);
  if (!(await consumeRateLimit(ip, "garage_offer", MAX_OFFERS_PER_IP_HOUR, { failClosed: true }))) {
    return NextResponse.json({ error: "عروض كثيرة — حاول بعد ساعة." }, { status: 429 });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "النظام غير مهيأ." }, { status: 500 });
  }

  let resolution;
  try {
    resolution = await resolveGarageOutreachToken(token);
  } catch (e) {
    console.error("submit-offer resolve outreach error:", e);
    return NextResponse.json({ error: "تعذّر جلب الطلب." }, { status: 500 });
  }
  if (!resolution) return NextResponse.json({ error: "الرابط غير صحيح أو انتهت صلاحيته." }, { status: 404 });

  // Measured links are workshop-scoped. Resolve identity server-side before
  // validation so caller-controlled name/phone never become attribution truth.
  if (resolution.workshopId) {
    const { data: workshop, error: workshopError } = await admin
      .from("workshops")
      .select("place_id,name,phone,phone_intl")
      .eq("place_id", resolution.workshopId)
      .maybeSingle();
    if (workshopError) {
      console.error("submit-offer workshop fetch error:", workshopError);
      return NextResponse.json({ error: "تعذّر التحقق من هوية الكراج." }, { status: 500 });
    }
    if (!workshop) return NextResponse.json({ error: "الكراج المرتبط بالرابط غير موجود." }, { status: 404 });
    body = {
      ...body,
      workshop_name: workshop.name,
      workshop_phone: workshop.phone_intl || workshop.phone || "",
    };
  }

  const result = validateOffer(body);
  if (result.errors) {
    const firstError = Object.values(result.errors)[0] ?? "بيانات العرض غير صحيحة.";
    return NextResponse.json({ error: firstError, fields: result.errors }, { status: 400 });
  }
  const offer = result.value;

  const { data: quote, error: qErr } = await admin
    .from("quotes")
    .select("id,service,status")
    .eq("id", resolution.quoteId)
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

  const { count } = await admin
    .from("quote_offers")
    .select("id", { count: "exact", head: true })
    .eq("quote_id", quote.id);
  if ((count ?? 0) >= MAX_OFFERS_PER_QUOTE) {
    return NextResponse.json({ error: "وصل هذا الطلب للحد الأقصى من العروض." }, { status: 429 });
  }

  const insertPayload: Record<string, unknown> = {
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
  };

  if (resolution.outreachId) insertPayload.outreach_id = resolution.outreachId;

  const { error: insErr } = await admin.from("quote_offers").insert(insertPayload);
  if (insErr) {
    console.error("submit-offer insert error:", insErr);
    return NextResponse.json({ error: "تعذّر حفظ العرض." }, { status: 500 });
  }

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
