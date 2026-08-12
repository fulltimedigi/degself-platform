import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  createIsolatedAuthClient,
  getSupabase,
  startAuthAutoRefresh,
} from "@/lib/supabase";
import { signInWithGoogle as googleSignIn } from "./google";
import { signInWithApple as appleSignIn } from "./apple";
import { verifyThenPromoteReauthentication } from "./reauth-guard";

export type AuthStatus = "loading" | "signedIn" | "signedOut";
export type AuthProviderName = "google" | "apple";

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  clearLocalSession: () => Promise<void>;
  /**
   * Re-run the original provider in an isolated auth client. The fresh session
   * is promoted into the app only after its Supabase user id exactly matches the
   * user that initiated reauthentication.
   */
  reauthenticate: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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

  const signInWithGoogle = useCallback(async () => {
    await googleSignIn();
  }, []);

  const signInWithApple = useCallback(async () => {
    await appleSignIn();
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
  }, []);

  const clearLocalSession = useCallback(async () => {
    await getSupabase().auth.signOut({ scope: "local" });
  }, []);

  const reauthenticate = useCallback(async () => {
    const original = session;
    const provider = providerOf(original?.user ?? null);
    if (!original || !provider) throw new Error("reauth-unknown-provider");

    // The candidate provider session stays completely isolated. A wrong account
    // therefore cannot trigger app-wide auth subscribers or RLS writes.
    const isolated = createIsolatedAuthClient();
    const fresh =
      provider === "apple"
        ? await appleSignIn(isolated)
        : await googleSignIn(isolated);

    const persistent = getSupabase();
    await verifyThenPromoteReauthentication(
      original.user.id,
      fresh.user.id,
      async () => {
        const { error } = await persistent.auth.setSession({
          access_token: fresh.access_token,
          refresh_token: fresh.refresh_token,
        });
        if (error) throw error;
      },
      async () => {
        const verified = await persistent.auth.getUser();
        if (verified.error) throw verified.error;
        return verified.data.user?.id;
      }
    );
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
