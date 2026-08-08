import Constants from "expo-constants";

// M1 environment model. Three logical environments; the active one is read from
// the app config `extra.appEnv` (wired per EAS profile). Development is the
// default when unset.
//
// SECURITY — every value bundled into the mobile app is PUBLIC. The only runtime
// config here is:
//   • Supabase URL + PUBLISHABLE key  (public by design; RLS is the boundary)
//   • the web API base URL            (public)
//   • the Google WEB OAuth client id  (public; it is the token audience, not a secret)
// NEVER put a secret here or in `extra`/EXPO_PUBLIC_*: no service-role key, DB
// URL, Supabase JWT secret, Anthropic/WABA/Meta secrets, Google client SECRET,
// admin credentials, or Vercel tokens. Those live only on the server.
//
// Public values are supplied via `EXPO_PUBLIC_*` env vars (inlined into the
// bundle at build time) so nothing environment-specific is committed to the
// repo. See .env.example. Development currently targets the same Supabase
// project as production because only one project exists (documented in the M1
// PR / README); use controlled test users, never real customer data, in dev.

export type AppEnv = "development" | "preview" | "production";

const RAW = (Constants.expoConfig?.extra as { appEnv?: unknown } | undefined)
  ?.appEnv;

export const APP_ENV: AppEnv =
  RAW === "production" || RAW === "preview" ? RAW : "development";

export const isDev = APP_ENV === "development";

/** PUBLIC Supabase project URL (e.g. https://<ref>.supabase.co). */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";

/** PUBLIC Supabase publishable (anon) key. Safe to ship; RLS is the boundary. */
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/**
 * Base URL of the DEGSELF web/API deployment (e.g. https://degself.com). The
 * native account-deletion Bearer call targets `${API_BASE_URL}/api/account/delete`.
 */
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? ""
).replace(/\/+$/, "");

/**
 * Google OAuth **WEB** client id — public. Used as the `webClientId` audience
 * for `signInWithIdToken` and must match the client id configured on the
 * Supabase Google provider. The iOS client id (reversed) is a build-time config
 * plugin value in app.json; no Google client SECRET ever ships in the app.
 */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

/** True when the minimum public Supabase config is present. */
export function hasSupabaseConfig(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_PUBLISHABLE_KEY.length > 0;
}

/** Throw a clear, actionable error when required PUBLIC config is missing. */
export function assertSupabaseConfig(): void {
  if (!hasSupabaseConfig()) {
    throw new Error(
      "Missing Supabase public config. Set EXPO_PUBLIC_SUPABASE_URL and " +
        "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see apps/mobile/.env.example)."
    );
  }
}
