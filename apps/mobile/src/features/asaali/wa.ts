// Pure helpers for the Asaali screen. No React Native / Expo imports so this is
// unit-testable under the node/tsx test runner.

/**
 * Build a wa.me link (digits only, no leading +) with an optional pre-filled
 * message. One tap opens WhatsApp to the garage with the ready diagnosis already
 * typed — a far better mobile flow than copy/paste.
 */
export function whatsAppUrl(phone: string, message?: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
