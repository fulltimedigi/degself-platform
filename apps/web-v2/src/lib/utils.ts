/** Truncate a string to `max` chars, adding an ellipsis when cut. */
export function truncate(s: string, max: number): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max).trim() + "…" : s;
}

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

/** Format an ISO date (YYYY-MM-DD) as Arabic "13 يونيو 2026". */
export function formatArabicDate(iso: string): string {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return iso;
  return `${d} ${AR_MONTHS[m - 1]} ${y}`;
}

// Arabic count word: singular / dual / paucal (3–10) / plural (11+).
function arCount(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

/** Relative Arabic time from an ISO timestamp, e.g. "منذ ساعة" / "منذ ٣ أيام". */
export function relativeArabic(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return iso;
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "الآن";
  if (mins < 60) return "منذ " + arCount(mins, "دقيقة", "دقيقتين", "دقائق", "دقيقة");
  const hours = Math.floor(mins / 60);
  if (hours < 24) return "منذ " + arCount(hours, "ساعة", "ساعتين", "ساعات", "ساعة");
  const days = Math.floor(hours / 24);
  if (days < 30) return "منذ " + arCount(days, "يوم", "يومين", "أيام", "يوماً");
  // older than a month → fall back to an absolute date
  return formatArabicDate(iso.slice(0, 10));
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
