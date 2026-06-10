/** Truncate a string to `max` chars, adding an ellipsis when cut. */
export function truncate(s: string, max: number): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max).trim() + "…" : s;
}

/**
 * wa.me digits for a Kuwaiti MOBILE number only (965 + [5/6/9] + 7 digits).
 * Returns null for landlines/hotlines (e.g. 1822500) so we don't show a
 * misleading WhatsApp button on numbers that aren't on WhatsApp.
 */
export function kuwaitWhatsAppDigits(phone: string | null | undefined): string | null {
  let d = (phone || "").replace(/\D/g, "");
  if (/^[569]\d{7}$/.test(d)) d = "965" + d; // local 8-digit mobile → add country code
  return /^965[569]\d{7}$/.test(d) ? d : null;
}
