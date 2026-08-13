import { kuwaitWhatsAppDigits } from "@/lib/utils";

// WhatsApp Business (Meta Cloud API) sender — SERVER ONLY. Everything here is
// gated behind WHATSAPP_ENABLED. While the flag is off (or config is missing),
// NO network call is ever made.

const GRAPH_VERSION = "v21.0";
const DEFAULT_TEMPLATE = "offers_ready_ar";
const DEFAULT_LANG = "ar";
const WA_TIMEOUT_MS = 10_000;

export function isWhatsAppEnabled(): boolean {
  return process.env.WHATSAPP_ENABLED === "true";
}

export function offersTemplateName(): string {
  return process.env.WHATSAPP_TEMPLATE_OFFERS || DEFAULT_TEMPLATE;
}

/** Garage RFQ has no implicit default: an explicitly approved Meta template is required. */
export function garageQuoteTemplateName(): string | null {
  const value = process.env.WHATSAPP_TEMPLATE_GARAGE_RFQ?.trim();
  return value || null;
}

export type WaSendResult =
  | { ok: true; messageId: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; error: string; status?: number };

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  components: unknown[],
  language: string = process.env.WHATSAPP_TEMPLATE_LANG || DEFAULT_LANG
): Promise<WaSendResult> {
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
      signal: AbortSignal.timeout(WA_TIMEOUT_MS),
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

/**
 * Send a free-form INTERACTIVE message (buttons/list). Only valid inside an open
 * 24h customer-service window (e.g. right after the customer replied to our
 * confirmation). Same WHATSAPP_ENABLED gate and fail-safe shape as templates.
 */
export async function sendWhatsAppInteractive(
  to: string,
  interactive: unknown
): Promise<WaSendResult> {
  if (!isWhatsAppEnabled()) return { ok: false, skipped: true, reason: "disabled" };

  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return { ok: false, skipped: true, reason: "unconfigured" };
  if (!to) return { ok: false, skipped: true, reason: "no_recipient" };

  const endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive,
  };
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(WA_TIMEOUT_MS),
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

/** Template body: service, car, area. Dynamic URL button receives only the token. */
export function garageQuoteTemplateComponents(
  service: string,
  car: string,
  area: string,
  token: string
): unknown[] {
  return [
    {
      type: "body",
      parameters: [
        { type: "text", text: service.slice(0, 120) },
        { type: "text", text: car.slice(0, 120) || "غير محدد" },
        { type: "text", text: area.slice(0, 120) || "غير محددة" },
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

export function garageOfferUrl(token: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://degself.com";
  return `${siteUrl}/submit-offer/${token}`;
}

// ── Customer-offer message builders ────────────────────────────────────────

export function offersUrl(token: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://degself.com";
  return `${siteUrl}/offers/${token}`;
}

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

export function customerOffersText(name: string, count: number, url: string): string {
  return (
    `عزيزي ${name}، عندك ${count} عرض سعر جاهز لطلبك.\n` +
    `اضغط هنا للاطلاع والاختيار:\n${url}`
  );
}

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
