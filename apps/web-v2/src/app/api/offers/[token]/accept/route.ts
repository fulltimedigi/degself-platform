import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendAdminWhatsApp } from "@/lib/callmebot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/offers/[token]/accept — PUBLIC (token-gated, no cookie). Body:
// { offer_id }. The customer picks one offer; it wins, the rest are rejected,
// the quote is marked accepted, and Ahmed is notified over WhatsApp.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "رابط غير صالح." }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }
  const offerId = typeof body.offer_id === "string" ? body.offer_id : "";
  if (!offerId) return NextResponse.json({ error: "لم يتم تحديد العرض." }, { status: 400 });

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "النظام غير مهيأ." }, { status: 500 });
  }

  // Resolve the quote from the token.
  const { data: quote, error: qErr } = await admin
    .from("quotes")
    .select("id,customer_name,service,status")
    .eq("customer_token", token)
    .maybeSingle();
  if (qErr) {
    console.error("accept fetch quote error:", qErr);
    return NextResponse.json({ error: "تعذّر جلب الطلب." }, { status: 500 });
  }
  if (!quote) return NextResponse.json({ error: "الرابط غير صحيح." }, { status: 404 });

  if (quote.status === "accepted") {
    return NextResponse.json({ error: "تم قبول أحد العروض بالفعل." }, { status: 409 });
  }
  if (quote.status === "expired") {
    return NextResponse.json({ error: "انتهت صلاحية هذا الرابط." }, { status: 410 });
  }

  // The offer must belong to THIS quote (prevents cross-quote acceptance).
  const { data: offer, error: oErr } = await admin
    .from("quote_offers")
    .select("id,quote_id,workshop_name,workshop_phone,price_kwd,status")
    .eq("id", offerId)
    .maybeSingle();
  if (oErr) {
    console.error("accept fetch offer error:", oErr);
    return NextResponse.json({ error: "تعذّر جلب العرض." }, { status: 500 });
  }
  if (!offer || offer.quote_id !== quote.id) {
    return NextResponse.json({ error: "العرض غير موجود." }, { status: 404 });
  }

  const nowIso = new Date().toISOString();

  // Accept the chosen offer, reject the rest, mark the quote accepted.
  const { error: acceptErr } = await admin
    .from("quote_offers")
    .update({ status: "accepted", accepted_at: nowIso })
    .eq("id", offer.id);
  if (acceptErr) {
    console.error("accept update offer error:", acceptErr);
    return NextResponse.json({ error: "تعذّر قبول العرض." }, { status: 500 });
  }
  await admin
    .from("quote_offers")
    .update({ status: "rejected" })
    .eq("quote_id", quote.id)
    .neq("id", offer.id);
  await admin
    .from("quotes")
    .update({ status: "accepted", updated_at: nowIso })
    .eq("id", quote.id);

  // Notify Ahmed. Must be awaited (serverless freezes fire-and-forget fetches).
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://degself.com";
  const lines = [
    "🎉 قبل العميل عرضاً!",
    `الطلب: ${quote.customer_name} — ${quote.service}`,
    `العرض المقبول: ${offer.workshop_name} — ${offer.price_kwd} د.ك`,
    offer.workshop_phone ? `هاتف الكراج: ${offer.workshop_phone}` : "",
    `رابط الإدارة: ${siteUrl}/admin/quotes/${quote.id}`,
  ].filter(Boolean);
  try {
    await sendAdminWhatsApp(lines.join("\n"));
  } catch (e) {
    console.error("accept notify failed:", e);
  }

  return NextResponse.json({ success: true });
}
