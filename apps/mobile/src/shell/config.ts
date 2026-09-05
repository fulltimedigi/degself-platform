// The single origin the shell renders. DEGSELF's whole product is the web
// platform; the native app is a thin, feature-added shell around it. The URL is
// public and build-time-inlined via EXPO_PUBLIC_* (see eas.json). Falls back to
// the existing API base, then to the production domain.
const RAW =
  process.env.EXPO_PUBLIC_WEB_URL ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "https://degself.com";

/** Origin the WebView loads, e.g. "https://degself.com" (no trailing slash). */
export const WEB_URL = RAW.replace(/\/+$/, "");

/** Bare host of the web origin, e.g. "degself.com" — used for link routing. */
export function webHost(): string {
  try {
    return new URL(WEB_URL).hostname;
  } catch {
    return "degself.com";
  }
}

// Appended to the WebView User-Agent so the site can detect it is running inside
// the native shell (e.g. to hide its own "install our app" / PWA prompts and to
// enable native affordances). Keep the token stable — the web reads it.
export const APP_UA_MARKER = "degselfApp/1.0";
