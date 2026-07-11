import { kuwaitWhatsAppDigits } from "@/lib/utils";

// WhatsApp Business (Meta Cloud API) sender — SERVER ONLY. Everything here is
// gated behind WHATSAPP_ENABLED. While the flag is off (or config is missing),
// NO network call is ever made — the callers fall back to the manual wa.me
// forward flow. Direct Cloud API (no BSP) so we pay per-message only.
//
// Required env when enabling (see .env.waba.example):
//   WHATSAPP_ENABLED=true
//   WHATSAPP_TOKEN=<permanent system-user token>
//   WHATSAPP_PHONE_NUMBER_ID=<numeric id of the sending number>
//   WHATSAPP_TEMPLATE_OFFERS=offers_ready_ar   (optional; default below)
//   WHATSAPP_TEMPLATE_LANG=ar                   (optional; default below)

const GRAPH_VERSION = "v21.0";
const DEFAULT_TEMPLATE = "offers_ready_ar";
const DEFAULT_LANG = "ar";

export function isWhatsAppEnabled(): boolean {
  return process.env.WHATSAPP_ENABLED === "true";
}

export function offersTemplateName(): string {
  return process.env.WHATSAPP_TEMPLATE_OFFERS || DEFAULT_TEMPLATE;
}

export type WaSendResult =
  | { ok: true; messageId: string }
  // skipped === true → we deliberately did NOT hit the API (flag off / unconfigured / bad input)
  | { ok: false; skipped: true; reason: string }
  // skipped === false → the API was called and failed
  | { ok: false; skipped: false; error: string; status?: number };

/**
 * Send an approved WhatsApp template. Returns skipped:true (no API call) when the
 * flag is off, config is missing, or the recipient is empty — callers treat that
 * exactly like the pre-WABA world and fall back to manual forwarding.
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  components: unknown[],
  language: string = process.env.WHATSAPP_TEMPLATE_LANG || DEFAULT_LANG
): Promise<WaSendResult> {
  // Hard gate — must be first. No side effects while disabled.
  if (!isWhatsAppEnabled()) return { ok: false, skipped: true, reason: "disabled" };

  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return { ok: false, skipped: true, reason: "unconfigured" };
  if (!to) return { ok: false, skipped: true, reason: "no_recipient" };

  const endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      components,
    },
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as {
      messages?: { id: string }[];
      error?: { message?: string };
    };
    const messageId = body?.messages?.[0]?.id;
    if (res.ok && messageId) return { ok: true, messageId };
    return {
      ok: false,
      skipped: false,
      status: res.status,
      error: body?.error?.message ?? `HTTP ${res.status}`,
    };
  } catch (e) {
    return { ok: false, skipped: false, error: e instanceof Error ? e.message : "network error" };
  }
}

// ── Message builders (shared by send-offers + webhook fallback) ──────────────

/** The exact link the customer opens. */
export function offersUrl(token: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://degself.com";
  return `${siteUrl}/offers/${token}`;
}

/** Template component params for `offers_ready_ar`: body {name,count} + URL button {token}. */
export function offersTemplateComponents(name: string, count: number, token: string): unknown[] {
  return [
    {
      type: "body",
      parameters: [
        { type: "text", text: name },
        { type: "text", text: String(count) },
      ],
    },
    {
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: token }],
    },
  ];
}

/** The plain message meant for the customer (used inside the wa.me forward link). */
export function customerOffersText(name: string, count: number, url: string): string {
  return (
    `عزيزي ${name}، عندك ${count} عرض سعر جاهز لطلبك.\n` +
    `اضغط هنا للاطلاع والاختيار:\n${url}`
  );
}

/**
 * The admin (Ahmed) forward message — one-tap wa.me deep-link pre-filled with the
 * customer message. This is the DEFAULT/fallback path; kept identical to the
 * pre-WABA behavior so the manual flow is unchanged while the flag is off.
 */
export function adminForwardText(
  name: string,
  service: string,
  count: number,
  phone: string,
  url: string
): string {
  const digits = kuwaitWhatsAppDigits(phone);
  const customerMsg = customerOffersText(name, count, url);
  return [
    "📤 جاهزة للإرسال — عروض طلب",
    `الطلب: ${name} — ${service}`,
    `عدد العروض: ${count}`,
    "",
    "أرسل هذا للعميل عبر واتساب:",
    digits ? `https://wa.me/${digits}?text=${encodeURIComponent(customerMsg)}` : `رقم العميل: ${phone}`,
    "",
    `رابط العميل: ${url}`,
  ].join("\n");
}
