import "react-native-url-polyfill/auto"; // supabase-js needs WHATWG URL on RN
import { AppState, type AppStateStatus } from "react-native";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  assertSupabaseConfig,
} from "@/config/env";
import { LargeSecureStore } from "@/lib/auth/secure-store";

// The single persistent Supabase client for the app. Uses the PUBLISHABLE key
// only — every data access is governed by RLS, exactly as on web. Sessions are
// persisted through LargeSecureStore; OAuth explicitly uses PKCE so access and
// refresh tokens never travel in the deep-link URL.
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
      flowType: "pkce",
      // We intentionally do not pass a custom `lock`. In the installed auth-js
      // line, custom locks are a legacy/deprecated compatibility path; the
      // client coordinates refreshes internally and the server resolves refresh
      // races. This decision is based on the package API, not on any one docs
      // snippet that may change over time.
    },
  });
  return client;
}

/**
 * Small in-memory storage used by an isolated reauthentication client. PKCE
 * still needs storage for its verifier between signInWithOAuth() and
 * exchangeCodeForSession(), but this candidate identity must never be persisted
 * or published to app-wide auth state before same-user verification succeeds.
 */
class MemoryStorage {
  private readonly values = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.values.delete(key);
  }
}

/**
 * Auth-only client for recent-auth verification. Its session remains isolated
 * in memory and is invisible to AuthProvider/FavoritesProvider. After the caller
 * proves identity equality it explicitly promotes the fresh tokens into the
 * persistent client with setSession().
 */
export function createIsolatedAuthClient(): SupabaseClient {
  assertSupabaseConfig();
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: new MemoryStorage(),
      storageKey: `degself-reauth-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
}

// Tie Supabase token auto-refresh to the app lifecycle: refresh while active,
// pause in the background. Registered ONCE from the auth provider on mount.
let appStateSub: { remove: () => void } | null = null;

export function startAuthAutoRefresh(): void {
  if (appStateSub) return;
  const supabase = getSupabase();
  const onChange = (state: AppStateStatus) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  };
  onChange(AppState.currentState);
  appStateSub = AppState.addEventListener("change", onChange);
}

export function stopAuthAutoRefresh(): void {
  appStateSub?.remove();
  appStateSub = null;
  client?.auth.stopAutoRefresh();
}
