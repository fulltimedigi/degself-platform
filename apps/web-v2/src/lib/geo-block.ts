// Edge geo-blocking for pure data-center bot traffic.
//
// degself is a Kuwait-only Arabic garage directory. Page traffic from certain
// regions is ~100% headless data-center crawlers/scrapers (e.g. mainland-China
// cloud IPs), which inflate the visitor count, wreck the bounce rate, and scrape
// the catalog — while never being real customers. We drop that traffic at the
// edge BEFORE the page and its analytics beacon render, so the numbers reflect
// real users again. Real search-engine crawlers are ALWAYS allowed through from
// every region, so SEO is never harmed.

export const DEFAULT_BLOCKED_COUNTRIES = ["CN"] as const;

// Well-known search-engine + social-preview crawlers — allowed from every region.
// A user agent can be spoofed, but the only payoff for faking one of these is a
// single extra pageview, so we always favor letting a possible real crawler
// through over the tiny risk of blocking one.
const SEARCH_BOT_RE =
  /(googlebot|google-inspectiontool|google-read-aloud|adsbot-google|mediapartners-google|storebot-google|bingbot|bingpreview|adidxbot|msnbot|slurp|duckduckbot|baiduspider|yandex(bot)?|applebot|petalbot|facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|pinterest(bot)?|slackbot|semrushbot|ahrefsbot|mj12bot|dotbot)/i;

export function isSearchEngineBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return SEARCH_BOT_RE.test(userAgent);
}

/**
 * Parse the BLOCKED_COUNTRIES env into uppercased ISO-3166 alpha-2 codes.
 *   - unset  → default block list (["CN"]) so protection is on out of the box
 *   - ""     → empty list = kill switch (disable blocking without a code deploy)
 *   - "cn,ru" → ["CN","RU"] (invalid/non-2-letter tokens dropped)
 */
export function parseBlockedCountries(raw: string | null | undefined): string[] {
  if (raw == null) return [...DEFAULT_BLOCKED_COUNTRIES];
  const trimmed = raw.trim();
  if (trimmed === "") return [];
  return trimmed
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z]{2}$/.test(c));
}

/**
 * True when this request should be dropped at the edge: its country is on the
 * block list AND it is not a real search-engine crawler. Missing country header
 * (e.g. local `next start`, where Vercel geo headers don't exist) is never blocked.
 */
export function shouldBlockRequest(
  country: string | null | undefined,
  userAgent: string | null | undefined,
  blocked: string[]
): boolean {
  if (blocked.length === 0) return false;
  if (!country) return false;
  if (!blocked.includes(country.toUpperCase())) return false;
  return !isSearchEngineBot(userAgent);
}
