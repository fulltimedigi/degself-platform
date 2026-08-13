import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendAdminWhatsApp } from "@/lib/callmebot";
import { adminForwardText, offersUrl } from "@/lib/whatsapp";
import { parseSettlementButtonReply } from "@/lib/settlement-confirmation";
import {
  applyCustomerConfirmationByPhone,
  isSettlementEnabled,
} from "@/lib/settlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tokenEquals(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const mode = p.get("hub.mode");
  const token = p.get("hub.verify_token") ?? "";
  const challenge = p.get("hub.challenge") ?? "";
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "";
  if (mode === "subscribe" && tokenEquals(token, expected)) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

interface WaStatus {
  id?: string;
  status?: string;
  timestamp?: string;
  errors?: { title?: string; message?: string }[];
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!appSecret) {
    console.error("whatsapp webhook: WHATSAPP_APP_SECRET missing");
    return new NextResponse("signature required", { status: 401 });
  }
  const sig = req.headers.get("x-hub-signature-256") ?? "";
  const expected = "sha256=" + createHmac("sha256", appSecret).update(raw).digest("hex");
  if (!tokenEquals(sig, expected)) return new NextResponse("invalid signature", { status: 401 });

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    const statuses: WaStatus[] = [];
    const messages: WaInboundMessage[] = [];
    const entries = (payload as { entry?: unknown[] })?.entry ?? [];
    for (const entry of entries) {
      const changes = (entry as { changes?: unknown[] })?.changes ?? [];
      for (const change of changes) {
        const value = (change as {
          value?: { statuses?: WaStatus[]; messages?: WaInboundMessage[] };
        })?.value;
        if (Array.isArray(value?.statuses)) statuses.push(...value.statuses);
        if (Array.isArray(value?.messages)) messages.push(...value.messages);
      }
    }
    if (statuses.length) await processStatuses(statuses);
    if (messages.length && isSettlementEnabled()) {
      await processSettlementReplies(messages);
    }
  } catch (e) {
    console.error("whatsapp webhook processing error:", e);
  }

  return NextResponse.json({ ok: true });
}

interface WaInboundMessage {
  from?: string;
  type?: string;
  interactive?: { type?: string; button_reply?: { id?: string } };
  button?: { payload?: string };
}

/** Route inbound completion-confirmation button taps to the settlement layer. */
async function processSettlementReplies(messages: WaInboundMessage[]) {
  for (const m of messages) {
    // Interactive reply buttons and template quick-reply buttons differ in shape.
    const buttonId =
      m.interactive?.type === "button_reply"
        ? m.interactive.button_reply?.id
        : m.button?.payload;
    const action = parseSettlementButtonReply(buttonId);
    if (!action) continue;
    try {
      await applyCustomerConfirmationByPhone(m.from, action === "confirmed");
    } catch (e) {
      console.error("settlement confirmation reply failed:", e);
    }
  }
}

function receiptTime(status: WaStatus): string {
  const seconds = Number(status.timestamp);
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : new Date().toISOString();
}

function statusError(status: WaStatus): string | null {
  const error = status.errors?.[0];
  const text = error?.message || error?.title;
  return text ? text.slice(0, 500) : null;
}

async function processGarageDeliveryStatus(
  admin: ReturnType<typeof getSupabaseAdmin>,
  s: WaStatus
): Promise<boolean> {
  if (!s.id || !s.status) return false;
  const { data: delivery, error } = await admin
    .from("quote_delivery_queue")
    .select("id,quote_id,status,delivered_at,read_at,failed_at")
    .eq("provider_message_id", s.id)
    .maybeSingle();

  // During staggered rollout before migration 034 exists, simply let the old
  // customer-message handler try this provider id instead.
  if (error || !delivery) return false;

  const at = receiptTime(s);
  const updates: Record<string, unknown> = {
    provider_status: s.status,
    updated_at: new Date().toISOString(),
  };

  if (s.status === "delivered" && !delivery.delivered_at) updates.delivered_at = at;
  if (s.status === "read" && !delivery.read_at) updates.read_at = at;
  if (s.status === "failed") {
    updates.status = "failed";
    if (!delivery.failed_at) updates.failed_at = at;
    updates.last_error = statusError(s) ?? "Meta delivery failed";
  }

  const { error: updateError } = await admin
    .from("quote_delivery_queue")
    .update(updates)
    .eq("id", delivery.id);
  if (updateError) {
    console.error("garage delivery receipt update failed:", updateError);
    return true;
  }

  if (s.status === "failed" && delivery.status !== "failed") {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://degself.com";
    try {
      await sendAdminWhatsApp(
        `⚠️ فشل توصيل طلب عرض سعر إلى كراج في الشبكة.\n🔗 ${siteUrl}/admin/quotes/${delivery.quote_id}`
      );
    } catch (e) {
      console.error("garage delivery failure alert failed:", e);
    }
  }
  return true;
}

async function processStatuses(statuses: WaStatus[]) {
  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return;
  }

  for (const s of statuses) {
    const wamid = s.id;
    const status = s.status;
    if (!wamid || !status) continue;

    if (await processGarageDeliveryStatus(admin, s)) continue;

    // Existing customer-offer delivery status flow.
    const { data: quote } = await admin
      .from("quotes")
      .select("id,customer_name,customer_phone,service,customer_token,wa_status")
      .eq("wa_message_id", wamid)
      .maybeSingle();
    if (!quote) continue;

    const alreadyFailed = quote.wa_status === "failed";
    await admin.from("quotes").update({ wa_status: status }).eq("id", quote.id);

    if (status === "failed" && !alreadyFailed) {
      const { count } = await admin
        .from("quote_offers")
        .select("id", { count: "exact", head: true })
        .eq("quote_id", quote.id as string);
      const url = offersUrl(quote.customer_token as string);
      const forward = adminForwardText(
        quote.customer_name as string,
        quote.service as string,
        count ?? 0,
        quote.customer_phone as string,
        url
      );
      try {
        await sendAdminWhatsApp("⚠️ فشل الإرسال التلقائي للعميل — أرسلها يدويًا:\n\n" + forward);
      } catch (e) {
        console.error("whatsapp fallback notify failed:", e);
      }
    }
  }
}
