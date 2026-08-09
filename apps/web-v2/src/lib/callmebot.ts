// ADMIN-ONLY CallMeBot sender — free WhatsApp notification to the DEGSELF operator.
//
// SECURITY BOUNDARY:
// - This module is NEVER a garage/RFQ delivery provider.
// - Garage RFQs are delivered only by the Meta WABA path in quote-delivery.ts.
// - A garage-facing capability URL (/submit-offer/<token>) must never pass through
//   CallMeBot. The runtime guard below fails closed if a caller violates this rule.
//
// Requires env CALLMEBOT_PHONE (the admin/operator number) + CALLMEBOT_APIKEY.
// Returns a small diagnostic result. IMPORTANT: callers must `await` this before
// the serverless function returns — a non-awaited (fire-and-forget) call is frozen
// by Vercel after the HTTP response and the fetch never completes.
const CALLMEBOT_TIMEOUT_MS = 4_000;

export type AdminWhatsAppResult = {
  configured: boolean;
  status?: number;
  body?: string;
  blocked?: boolean;
};

function containsGarageCapability(text: string): boolean {
  return /\/submit-offer\//i.test(text);
}

export async function sendAdminWhatsApp(text: string): Promise<AdminWhatsAppResult> {
  // Defense in depth: even if a future caller accidentally tries to use this
  // admin channel for a garage request, do not transmit the capability link.
  if (containsGarageCapability(text)) {
    console.error("callmebot: blocked garage-facing RFQ capability on admin-only channel");
    return { configured: false, blocked: true, body: "garage_rfq_forbidden" };
  }

  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) return { configured: false };

  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
    phone
  )}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(CALLMEBOT_TIMEOUT_MS),
    });
    const body = (await res.text()).slice(0, 300);
    return { configured: true, status: res.status, body };
  } catch (e) {
    console.error("callmebot: admin notification failed or timed out:", e);
    return { configured: true, status: 0, body: "timeout_or_error" };
  }
}
