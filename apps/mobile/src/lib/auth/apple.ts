import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import aesjs from "aes-js";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

// Native Sign in with Apple → Supabase (iOS only). REQUIRED for App Store review
// because the app offers Google Sign-In. The resulting identity resolves into
// the SAME Supabase Auth user system as Google, never a parallel user store.
export class AppleSignInCancelled extends Error {
  constructor() {
    super("apple-sign-in-cancelled");
    this.name = "AppleSignInCancelled";
  }
}

export async function isAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

function randomNonce(byteLength = 32): string {
  const bytes = Crypto.getRandomValues(new Uint8Array(byteLength));
  return aesjs.utils.hex.fromBytes(bytes);
}

/**
 * Run native Apple authentication against the provided Supabase client. Passing
 * an isolated client is used for same-user recent-auth verification before a
 * destructive action.
 */
export async function signInWithApple(
  supabase: SupabaseClient = getSupabase()
): Promise<Session> {
  const rawNonce = randomNonce();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e) {
    if ((e as { code?: string })?.code === "ERR_REQUEST_CANCELED") {
      throw new AppleSignInCancelled();
    }
    throw e;
  }

  const identityToken = credential.identityToken;
  if (!identityToken) throw new Error("apple-no-identity-token");

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;
  if (!data.session) throw new Error("apple-no-session");
  return data.session;
}
