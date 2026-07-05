// Shared CallMeBot sender — free WhatsApp notification to the site admin.
// Requires env CALLMEBOT_PHONE (e.g. 96565799195) + CALLMEBOT_APIKEY.
// No-ops silently when unconfigured. Fire-and-forget: callers should .catch().
export async function sendAdminWhatsApp(text: string): Promise<void> {
  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) return;

  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
    phone
  )}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;

  await fetch(url, { method: "GET" });
}
