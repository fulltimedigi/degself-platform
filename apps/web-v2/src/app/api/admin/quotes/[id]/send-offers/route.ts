import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/admin-auth";
import { sendAdminWhatsApp } from "@/lib/callmebot";
import { kuwaitWhatsAppDigits } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/quotes/[id]/send-offers — mint the public customer token (if
// missing), flip status to 'offers_sent', and notify.
//
// DELIVERY NOTE: CallMeBot can only message a number that registered its OWN api
// key — i.e. Ahmed's phone, never an arbitrary customer's. So we can't push the
// link straight to the customer for free (WABA is deferred). Instead we notify
// Ahmed with a one-tap wa.me deep-link, pre-filled with the exact customer
// message, so forwarding it is a single tap. The admin UI also copies the URL.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }
  const { id } = await params;

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "النظام غير مهيأ." }, { status: 500 });
  }

  const { data: quote, error: qErr } = await admin
    .from("quotes")
    .select("id,customer_name,customer_phone,service,status,customer_token")
    .eq("id", id)
    .maybeSingle();
  if (qErr) {
    console.error("send-offers fetch error:", qErr);
    return NextResponse.json({ error: "تعذّر جلب الطلب." }, { status: 500 });
  }
  if (!quote) return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });

  // Must have at least one offer to send.
  const { count } = await admin
    .from("quote_offers")
    .select("id", { count: "exact", head: true })
    .eq("quote_id", id);
  const offersCount = count ?? 0;
  if (offersCount < 1) {
    return NextResponse.json({ error: "لا توجد عروض لإرسالها." }, { status: 400 });
  }

  // Reuse an existing token so the link stays stable if sent twice.
  const token = (quote.customer_token as string | null) ?? randomBytes(16).toString("hex");

  const { error: uErr } = await admin
    .from("quotes")
    .update({ customer_token: token, status: "offers_sent", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (uErr) {
    console.error("send-offers update error:", uErr);
    return NextResponse.json({ error: "تعذّر تحديث الطلب." }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://degself.com";
  const url = `${siteUrl}/offers/${token}`;

  // The exact message meant for the customer.
  const customerMsg =
    `عزيزي ${quote.customer_name}، عندك ${offersCount} عرض سعر جاهز لطلبك.\n` +
    `اضغط هنا للاطلاع والاختيار:\n${url}`;

  // Notify Ahmed with a one-tap forward link (see DELIVERY NOTE above).
  const digits = kuwaitWhatsAppDigits(quote.customer_phone as string);
  const adminLines = [
    "📤 جاهزة للإرسال — عروض طلب",
    `الطلب: ${quote.customer_name} — ${quote.service}`,
    `عدد العروض: ${offersCount}`,
    "",
    "أرسل هذا للعميل عبر واتساب:",
    digits ? `https://wa.me/${digits}?text=${encodeURIComponent(customerMsg)}` : `رقم العميل: ${quote.customer_phone}`,
    "",
    `رابط العميل: ${url}`,
  ];
  try {
    await sendAdminWhatsApp(adminLines.join("\n"));
  } catch (e) {
    // Notify failure must not fail the request — the token/status are already saved.
    console.error("send-offers notify failed:", e);
  }

  return NextResponse.json({ success: true, url });
}
