import { WEB_URL, webHost } from "./config";

// Pure push helpers, kept free of react-native / expo-notifications imports so
// they can be unit-tested under plain Node (the native module wrappers live in
// push.ts). config.ts is itself pure (env + URL only), so importing it here is
// safe outside a device runtime.

export const ANDROID_CHANNEL_ID = "default";
export const PUSH_REGISTER_PATH = "/api/mobile/push/register";

/** Body we POST to the backend token registry. */
export function registerPayload(token: string, platform: string) {
  return { token, platform };
}

/**
 * Resolve the in-app destination for a tapped notification. Notifications may
 * carry `{ url }` (absolute) or `{ path }` (relative to our origin) in their
 * data. We ONLY ever navigate within our own host — a push must never be able to
 * point the in-app WebView at an arbitrary origin — so anything off-host (or
 * unparseable, or a non-http(s) scheme) resolves to null and is ignored.
 */
export function resolveNotificationUrl(
  data: unknown,
  webUrl: string = WEB_URL,
  host: string = webHost(),
): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const raw = typeof record.url === "string" ? record.url : record.path;
  if (typeof raw !== "string" || raw.trim() === "") return null;
  try {
    const abs = new URL(raw, `${webUrl}/`);
    if (abs.protocol !== "https:" && abs.protocol !== "http:") return null;
    if (abs.hostname !== host) return null;
    return abs.toString();
  } catch {
    return null;
  }
}
