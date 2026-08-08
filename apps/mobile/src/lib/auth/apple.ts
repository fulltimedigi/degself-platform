import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import aesjs from "aes-js";
import { getSupabase } from "@/lib/supabase";

// Native Sign in with Apple → Supabase (iOS only). REQUIRED for App Store review
// because the app offers Google Sign-In (Guideline 4.8 — see ADR-0007). Uses the
// supported native path (expo-apple-authentication) — NOT a WebView — and the
// resulting Apple identity resolves into the SAME Supabase Auth user system as
// Google, never a parallel user store.
//
// Nonce: Apple receives the SHA-256 hash of a random raw nonce; Supabase receives
// the RAW nonce and re-hashes it to verify the token's `nonce` claim. This binds
// the credential to this sign-in attempt (replay/interception defense).

export class AppleSignInCancelled extends Error {
  constructor() {
    super("apple-sign-in-cancelled");
    this.name = "AppleSignInCancelled";
  }
}

/** iOS-only, and only where the OS actually supports Sign in with Apple. */
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
 * Run the native Apple credential flow and exchange the identity token for a
 * Supabase session. Throws AppleSignInCancelled if the user backs out, or a
 * Supabase AuthError if the exchange fails.
 */
export async function signInWithApple(): Promise<void> {
  const rawNonce = randomNonce();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    // FULL_NAME + EMAIL are requested to keep the door open, but note: Apple
    // returns fullName/email ONLY on the user's FIRST authorization for this app
    // (null on every later sign-in), and the identity we authenticate with lives
    // entirely inside `identityToken`. M1 needs only the token (email/identity),
    // so fullName is intentionally not consumed here. Any future profile-name
    // capture must persist fullName on that first sign-in — it cannot be re-read
    // from Apple afterwards.
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

  const { error } = await getSupabase().auth.signInWithIdToken({
    provider: "apple",
    token: identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;
}
