import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, startAuthAutoRefresh } from "@/lib/supabase";
import { signInWithGoogle as googleSignIn, signOutGoogle } from "./google";
import { signInWithApple as appleSignIn } from "./apple";

// The smallest cohesive auth/session abstraction the app needs. Supabase Auth
// remains the single authority — this provider does NOT duplicate session state
// into a separate store (no Zustand); it mirrors Supabase's session via
// onAuthStateChange and exposes the operations screens need. Bootstrap restores
// the persisted (encrypted) session; auto-refresh is tied to app foreground.

export type AuthStatus = "loading" | "signedIn" | "signedOut";
export type AuthProviderName = "google" | "apple";

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Clear ONLY the local session with no network call. Used after a confirmed
   * account deletion — the server identity is already gone (its sessions/refresh
   * tokens cascaded), so a server-side sign-out would fail; this deterministically
   * wipes the encrypted local session (LargeSecureStore) and the native Google
   * session so no deleted-user token lingers on the device.
   */
  clearLocalSession: () => Promise<void>;
  /**
   * Force a fresh provider sign-in to satisfy the server's recent-auth gate
   * (used to recover from AUTH_TOO_OLD before account deletion). Re-runs the
   * SAME provider the account was created with — OAuth users have no password.
   */
  reauthenticate: () => Promise<void>;
  /** Current access token for the native Bearer transport, or null. */
  getAccessToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Which OAuth provider backs this user, from Supabase-verified identity. */
export function providerOf(user: User | null): AuthProviderName | null {
  const p = user?.app_metadata?.provider;
  if (p === "google" || p === "apple") return p;
  const ids = user?.identities ?? [];
  for (const id of ids) {
    if (id.provider === "apple") return "apple";
    if (id.provider === "google") return "google";
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    const supabase = getSupabase();
    startAuthAutoRefresh();
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        setStatus(data.session ? "signedIn" : "signedOut");
      })
      .catch(() => {
        if (mounted) setStatus("signedOut");
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setStatus(s ? "signedIn" : "signedOut");
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(() => googleSignIn(), []);
  const signInWithApple = useCallback(() => appleSignIn(), []);

  const signOut = useCallback(async () => {
    // Clear the native Google session too so the next sign-in shows the picker.
    await Promise.allSettled([signOutGoogle()]);
    await getSupabase().auth.signOut();
  }, []);

  const clearLocalSession = useCallback(async () => {
    await Promise.allSettled([
      signOutGoogle(),
      getSupabase().auth.signOut({ scope: "local" }),
    ]);
  }, []);

  const reauthenticate = useCallback(async () => {
    const provider = providerOf(session?.user ?? null);
    if (provider === "apple") return appleSignIn();
    if (provider === "google") return googleSignIn();
    throw new Error("reauth-unknown-provider");
  }, [session]);

  const getAccessToken = useCallback(async () => {
    const { data } = await getSupabase().auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      signInWithGoogle,
      signInWithApple,
      signOut,
      clearLocalSession,
      reauthenticate,
      getAccessToken,
    }),
    [
      status,
      session,
      signInWithGoogle,
      signInWithApple,
      signOut,
      clearLocalSession,
      reauthenticate,
      getAccessToken,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
