import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { GOOGLE_WEB_CLIENT_ID } from "@/config/env";
import { getSupabase } from "@/lib/supabase";

// Native Google Sign-In → Supabase. The native SDK returns a Google ID token,
// which is exchanged for a Supabase session via signInWithIdToken. No browser
// round-trip, no PKCE, and NO client secret in the app: the WEB client id is the
// public token audience (also set on the Supabase Google provider). Requires a
// custom dev build — this native module does not run in Expo Go.

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  // webClientId is the audience for the ID token; must match the Supabase
  // Google provider's client id. It is PUBLIC (not a secret).
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  configured = true;
}

export class GoogleSignInCancelled extends Error {
  constructor() {
    super("google-sign-in-cancelled");
    this.name = "GoogleSignInCancelled";
  }
}

/**
 * Run the native Google account picker and exchange the resulting ID token for
 * a Supabase session. Throws GoogleSignInCancelled if the user backs out, or a
 * Supabase AuthError if the exchange fails. On success the app's auth listener
 * (onAuthStateChange) picks up the new session.
 */
export async function signInWithGoogle(): Promise<void> {
  ensureConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  let response;
  try {
    response = await GoogleSignin.signIn();
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new GoogleSignInCancelled();
    }
    throw e;
  }

  if (!isSuccessResponse(response)) {
    // User cancelled the picker.
    throw new GoogleSignInCancelled();
  }

  const idToken = response.data.idToken;
  if (!idToken) throw new Error("google-no-id-token");

  const { error } = await getSupabase().auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });
  if (error) throw error;
}

/** Best-effort native sign-out so the next sign-in shows the account picker. */
export async function signOutGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    /* not signed in with Google, or module unavailable — ignore */
  }
}
