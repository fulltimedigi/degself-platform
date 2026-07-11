import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/admin-auth";
import { sendAdminWhatsApp } from "@/lib/callmebot";
import { kuwaitWhatsAppDigits } from "@/lib/utils";
import {
  isWhatsAppEnabled,
  sendWhatsAppTemplate,
  offersTemplateName,
  offersTemplateComponents,
  offersUrl,
  adminForwardText,
} from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/quotes/[id]/send-offers — mint the public customer token (if
// missing), flip status to 'offers_sent', and notify.
//
// DELIVERY: two paths, chosen at runtime.
//  • DEFAULT (WHATSAPP_ENABLED != true): the manual concierge flow — CallMeBot
//    notifies Ahmed with a one-tap wa.me deep-link pre-filled with the customer
//    message; he forwards it. No Meta API is touched at all.
//  • AUTO (WHATSAPP_ENABLED == true + Cloud API configured): send the approved
//    template straight to the customer via Meta Cloud API, record the wamid, and
//    just ping Ahmed that it went out. On any send failure we fall back to the
//    manual path so nothing is ever lost.
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

  const name = quote.customer_name as string;
  const service = quote.service as string;
  const phone = quote.customer_phone as string;
  const url = offersUrl(token);

  // ── AUTO path (flag-gated). No Meta call is attempted unless the flag is on. ──
  let waSent = false;
  if (isWhatsAppEnabled()) {
    const digits = kuwaitWhatsAppDigits(phone);
    if (digits) {
      const r = await sendWhatsAppTemplate(
        digits,
        offersTemplateName(),
        offersTemplateComponents(name, offersCount, token)
      );
      if (r.ok) {
        waSent = true;
        await admin
          .from("quotes")
          .update({ wa_message_id: r.messageId, wa_status: "sent", offers_sent_at: new Date().toISOString() })
          .eq("id", id);
      } else if (!r.skipped) {
        // API was called and failed → fall through to the manual path below.
        console.error("WABA send failed, falling back to manual:", r.error);
      }
    }
  }

  // ── Notify Ahmed. Must be awaited (serverless freezes fire-and-forget fetch). ──
  try {
    if (waSent) {
      await sendAdminWhatsApp(
        `✅ أُرسلت العروض تلقائيًا للعميل عبر واتساب.\n` +
          `الطلب: ${name} — ${service} (${offersCount} عروض)\n${url}`
      );
    } else {
      // DEFAULT manual-forward message — identical to the pre-WABA behavior.
      await sendAdminWhatsApp(adminForwardText(name, service, offersCount, phone, url));
    }
  } catch (e) {
    // Notify failure must not fail the request — the token/status are already saved.
    console.error("send-offers notify failed:", e);
  }

  return NextResponse.json({ success: true, url, wa_sent: waSent });
}
