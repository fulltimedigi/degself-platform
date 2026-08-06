/**
 * Allow only http(s) URLs for user-supplied links rendered as href/src.
 * Blocks javascript:, data:, vbscript:, and protocol-relative //evil.
 */
export function isSafeHttpUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s || s.length > 600) return false;
  if (s.startsWith("//")) return false;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Filter + trim a photo URL list for quote insert / admin display. */
export function sanitizePhotoUrls(input: unknown, max = 3): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const p of input) {
    if (typeof p !== "string") continue;
    const t = p.trim().slice(0, 600);
    if (!isSafeHttpUrl(t)) continue;
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}
