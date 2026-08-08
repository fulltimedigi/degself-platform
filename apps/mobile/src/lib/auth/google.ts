import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as WebBrowser from "expo-web-browser";
import { getSupabase } from "@/lib/supabase";

// Google Sign-In via Supabase `signInWithOAuth` + the system auth session — the
// CURRENT Supabase-supported mobile path (docs: "Native Mobile Deep Linking").
//
// Why NOT the native @react-native-google-signin picker: Supabase's own Expo
// Social Auth quickstart states the FREE tier of that package "doesn't support
// iOS or Android, as it doesn't allow to pass a custom nonce" to signInWithIdToken;
// the nonce-capable native path is the PAID Universal Sign In. This OAuth flow
// is free, works on iOS + Android, and ships NO Google client id/secret in the
// bundle — the Google client is configured only on the Supabase Google provider
// (server-side). See ADR-0005.
//
// The redirect returns to the app via the `degself://` scheme (registered as
// `degself://**` in Supabase Auth → URL Configuration). Full Universal/App Links
// remain M6; M1 uses the scheme only for this auth callback.

// Dismiss any lingering auth session from a previous attempt (recommended).
WebBrowser.maybeCompleteAuthSession();

export class GoogleSignInCancelled extends Error {
  constructor() {
    super("google-sign-in-cancelled");
    this.name = "GoogleSignInCancelled";
  }
}

/** Turn the redirect URL into a Supabase session (supports PKCE and implicit). */
async function createSessionFromUrl(url: string): Promise<void> {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);

  const supabase = getSupabase();
  if (params.access_token) {
    // Implicit flow: tokens are in the redirect.
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) throw error;
    return;
  }
  if (params.code) {
    // PKCE flow: exchange the code (the verifier stored at signInWithOAuth time
    // lives in the client's secure storage).
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return;
  }
  // No tokens and no code → nothing to establish (treat as cancelled upstream).
  throw new GoogleSignInCancelled();
}

/**
 * Open the Google OAuth flow in the system auth session and establish a Supabase
 * session from the redirect. Throws GoogleSignInCancelled if the user dismisses
 * the browser, or a Supabase AuthError on failure. On success the app's auth
 * listener (onAuthStateChange) picks up the new session.
 */
export async function signInWithGoogle(): Promise<void> {
  const redirectTo = makeRedirectUri(); // e.g. degself://
  const supabase = getSupabase();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("google-no-oauth-url");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") {
    // "cancel" | "dismiss" | "locked"
    throw new GoogleSignInCancelled();
  }
  await createSessionFromUrl(result.url);
}
