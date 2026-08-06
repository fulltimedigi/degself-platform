// Shared CallMeBot sender — free WhatsApp notification to the site admin.
// Requires env CALLMEBOT_PHONE (e.g. 96565799195) + CALLMEBOT_APIKEY.
// Returns a small diagnostic result. IMPORTANT: callers must `await` this before
// the serverless function returns — a non-awaited (fire-and-forget) call is frozen
// by Vercel after the HTTP response and the fetch never completes.
const CALLMEBOT_TIMEOUT_MS = 4_000;

export async function sendAdminWhatsApp(
  text: string
): Promise<{ configured: boolean; status?: number; body?: string }> {
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
    console.error("callmebot: send failed or timed out:", e);
    return { configured: true, status: 0, body: "timeout_or_error" };
  }
}
