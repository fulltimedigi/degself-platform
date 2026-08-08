import Constants from "expo-constants";

// M0 environment model. Three logical environments; the active one is read from
// the app config `extra.appEnv` (wired per EAS profile later). Development is the
// default when unset.
//
// SECURITY: every value bundled into the mobile app is PUBLIC. Do NOT put any
// secret here or in app config `extra` — no service-role key, DB URL, Anthropic
// key, WABA/Meta secrets, admin credentials, Vercel tokens, or private PostHog
// secrets. Public runtime config (e.g. Supabase URL + publishable key) is added
// in M1 when auth/data integration actually needs it — not preemptively in M0.

export type AppEnv = "development" | "preview" | "production";

const RAW = (Constants.expoConfig?.extra as { appEnv?: unknown } | undefined)?.appEnv;

export const APP_ENV: AppEnv =
  RAW === "production" || RAW === "preview" ? RAW : "development";

export const isDev = APP_ENV === "development";
