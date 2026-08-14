import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as WebBrowser from "expo-web-browser";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import {
  assertOAuthBrowserSuccess,
  GoogleSignInCancelled,
  resolvePkceCode,
} from "./oauth-code";

// Google Sign-In via Supabase signInWithOAuth + the system auth session.
// The Supabase client is explicitly configured for PKCE: the deep link carries
// only a short-lived authorization code, while the verifier stays on the device.
WebBrowser.maybeCompleteAuthSession();

export { GoogleSignInCancelled };

async function createSessionFromUrl(
  supabase: SupabaseClient,
  url: string
): Promise<Session> {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  const code = resolvePkceCode({ params, errorCode });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  if (!data.session) throw new Error("google-no-session");
  return data.session;
}

/**
 * Run Google OAuth against the provided Supabase client. Normal sign-in uses the
 * persistent app client. Sensitive reauthentication passes an isolated client
 * so a different Google account cannot mutate app-wide state before verification.
 */
export async function signInWithGoogle(
  supabase: SupabaseClient = getSupabase()
): Promise<Session> {
  const redirectTo = makeRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("google-no-oauth-url");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  assertOAuthBrowserSuccess(result.type);
  return createSessionFromUrl(supabase, (result as { url: string }).url);
}
