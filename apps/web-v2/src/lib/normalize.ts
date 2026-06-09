/**
 * Arabic text normalization — TypeScript mirror of the SQL public.normalize_arabic()
 * in migrations/002_search_text.sql. Keep the two in sync.
 *
 * Used client-side for search hints / highlighting. The authoritative search
 * column (`workshops.search_text`) is normalized by the SQL function on the server.
 *
 * Steps (a-g) match the SQL exactly:
 *   a) lowercase ASCII letters (Arabic has no case)
 *   b) strip tashkeel (ً-ْ) + tatweel (ـ)
 *   c) unify  أإآٱ→ا | ىی→ي | ة→ه | ک→ك | ؤ→و | ئ→ي
 *   d) drop standalone hamza ء
 *   e) Kuwaiti garage variants  [كقج]راج → كراج
 *   f) collapse repeated whitespace
 *   g) trim
 */
export function normalizeArabic(input: string): string {
  if (!input) return "";
  return input
    .replace(/[A-Z]/g, (c) => c.toLowerCase()) // a
    .replace(/[ً-ْـ]/g, "") // b
    .replace(/[أإآٱ]/g, "ا") // c
    .replace(/[ىی]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ک/g, "ك")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ء/g, "") // d
    .replace(/[كقج]راج/g, "كراج") // e
    .replace(/\s+/g, " ") // f
    .trim(); // g
}
