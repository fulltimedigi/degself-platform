// Pure URL routing policy for the WebView shell — no React Native imports, so it
// is unit-testable with the repo's node:test runner. Decides, for every
// navigation the WebView is about to start, whether to keep it inside the app,
// hand it to the OS (tel/WhatsApp/maps/…), or open it in the system browser.

export type UrlAction =
  | "webview" // keep inside the in-app WebView (our own site)
  | "native" // hand to the OS via Linking (tel:, wa.me, maps, …)
  | "system-browser"; // open in an in-app system browser tab (other websites, OAuth)

// Schemes that are never web pages — always handed to the OS.
const NATIVE_SCHEMES = new Set([
  "tel",
  "mailto",
  "sms",
  "whatsapp",
  "geo",
  "maps",
  "intent",
  "market",
  "itms-apps",
  "itms-appss",
]);

// Hosts that must open in their own native app / dialer rather than our WebView.
const NATIVE_HOSTS = new Set([
  "wa.me",
  "api.whatsapp.com",
  "chat.whatsapp.com",
  "maps.google.com",
  "maps.app.goo.gl",
]);

// OAuth / identity providers block embedded WebViews (Google's
// "disallowed_useragent"), so they must open in a real system browser.
const AUTH_HOSTS = new Set([
  "accounts.google.com",
  "appleid.apple.com",
]);

function hostMatches(host: string, base: string): boolean {
  return host === base || host.endsWith(`.${base}`);
}

/**
 * @param rawUrl   the URL the WebView is about to load
 * @param appHost  our own web origin host (e.g. "degself.com")
 */
export function classifyUrl(rawUrl: string, appHost: string): UrlAction {
  const url = (rawUrl ?? "").trim();
  if (!url) return "webview";

  // about:blank and in-page fragments stay in the WebView.
  if (url === "about:blank" || url.startsWith("#")) return "webview";

  // Scheme-only decisions first (covers tel:, mailto:, whatsapp:, …).
  const schemeMatch = /^([a-z][a-z0-9+.-]*):/i.exec(url);
  const scheme = schemeMatch ? schemeMatch[1].toLowerCase() : "";
  if (scheme && scheme !== "http" && scheme !== "https") {
    return NATIVE_SCHEMES.has(scheme) ? "native" : "system-browser";
  }

  // Relative URLs (no scheme) are our own site.
  if (!scheme) return "webview";

  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "webview";
  }

  const base = appHost.toLowerCase().replace(/^www\./, "");
  if (hostMatches(host, base)) return "webview";
  if (NATIVE_HOSTS.has(host)) return "native";
  if (AUTH_HOSTS.has(host) || host.endsWith(".supabase.co")) return "system-browser";

  // Any other website → system browser (keeps our shell from wandering off-site).
  return "system-browser";
}
