const WORKSHOP_PATH = /(?:^|\/)workshop\/([^/?#]+)/i;

export type WorkshopLinkParseResult =
  | { ok: true; placeId: string }
  | { ok: false; error: "invalid_url" | "not_workshop_url" | "invalid_place_id" };

/**
 * Extract the canonical case-sensitive place_id from a DEGSELF workshop URL.
 * Accepts locale-prefixed and unprefixed URLs and ignores query/hash suffixes.
 */
export function parseWorkshopLink(input: string): WorkshopLinkParseResult {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "invalid_url" };

  let pathname = raw;
  try {
    const url = new URL(raw, "https://degself.com");
    if (url.hostname && !/^(?:www\.)?degself\.com$/i.test(url.hostname)) {
      return { ok: false, error: "invalid_url" };
    }
    pathname = url.pathname;
  } catch {
    return { ok: false, error: "invalid_url" };
  }

  const match = pathname.match(WORKSHOP_PATH);
  if (!match?.[1]) return { ok: false, error: "not_workshop_url" };

  let placeId: string;
  try {
    placeId = decodeURIComponent(match[1]).trim();
  } catch {
    return { ok: false, error: "invalid_place_id" };
  }

  // Google Place IDs are opaque and case-sensitive. Keep them verbatim, but reject
  // obviously malformed/path-breaking values before hitting the database.
  if (!placeId || placeId.length > 255 || /[\s/\\]/.test(placeId)) {
    return { ok: false, error: "invalid_place_id" };
  }

  return { ok: true, placeId };
}
