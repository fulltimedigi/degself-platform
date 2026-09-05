import "react-native-url-polyfill/auto"; // supabase-js needs WHATWG URL on RN
import { AppState, type AppStateStatus } from "react-native";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  assertSupabaseConfig,
} from "@/config/env";
import { LargeSecureStore } from "@/lib/auth/secure-store";

// The single Supabase client for the app. Uses the PUBLISHABLE key only — every
// data access is governed by RLS, exactly as on web. The session is persisted
// through LargeSecureStore (encrypted; auth secrets never sit in plain storage),
// auto-refreshed while the app is foregrounded, and `detectSessionInUrl` is off
// because React Native has no URL to parse.

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  assertSupabaseConfig();
  client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: new LargeSecureStore(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // NOTE on `lock`: we intentionally do NOT pass `lock: processLock`. Audited
      // against the installed @supabase/auth-js 2.112.2, where `processLock` is
      // now @deprecated — "The auth client coordinates refreshes itself and the
      // server resolves concurrent refresh races, so passing { lock: processLock }
      // to it has no effect. You can safely drop the import." The current
      // Supabase RN quickstart no longer sets it. Adding it would be a misleading
      // no-op. Concurrency safety is handled by the client + server, not a lock here.
    },
  });
  return client;
}

// Tie Supabase token auto-refresh to the app lifecycle: refresh while active,
// pause in the background. Registered ONCE from the auth provider on mount.
// (Do NOT use browser visibility APIs — this is the RN-supported pattern.)
let appStateSub: { remove: () => void } | null = null;

export function startAuthAutoRefresh(): void {
  if (appStateSub) return;
  const supabase = getSupabase();
  const onChange = (state: AppStateStatus) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  };
  // Kick off immediately for the current (active) state, then subscribe.
  onChange(AppState.currentState);
  appStateSub = AppState.addEventListener("change", onChange);
}

export function stopAuthAutoRefresh(): void {
  appStateSub?.remove();
  appStateSub = null;
  client?.auth.stopAutoRefresh();
}
