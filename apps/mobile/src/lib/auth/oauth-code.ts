// Pure, dependency-free OAuth-callback validation. Kept out of google.ts (which
// imports expo-web-browser / expo-auth-session) so the PKCE invariants can be
// unit-tested in Node without loading native modules.

export class GoogleSignInCancelled extends Error {
  constructor() {
    super("google-sign-in-cancelled");
    this.name = "GoogleSignInCancelled";
  }
}

type CallbackParams = {
  params: Record<string, string | undefined | null>;
  errorCode?: string | null;
};

/**
 * Resolve the single authorization CODE from an OAuth redirect, enforcing PKCE:
 * - a provider-reported error is surfaced;
 * - only `?code=` is accepted;
 * - access_token / refresh_token in the URL are NEVER accepted (no implicit-flow
 *   fallback) — absence of a code is a hard failure.
 */
export function resolvePkceCode({ params, errorCode }: CallbackParams): string {
  if (errorCode) throw new Error(errorCode);
  const code = typeof params.code === "string" ? params.code : "";
  if (!code) {
    // Never accept implicit-flow tokens from a redirect URL as a fallback.
    throw new Error("google-missing-pkce-code");
  }
  return code;
}

/** The system browser must report success; anything else is a user cancel/dismiss. */
export function assertOAuthBrowserSuccess(resultType: string): void {
  if (resultType !== "success") throw new GoogleSignInCancelled();
}
