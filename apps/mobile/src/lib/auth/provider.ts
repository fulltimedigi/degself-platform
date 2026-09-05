// Pure provider resolution, split out of auth-context so it can be unit-tested
// without importing React / React Native / the Supabase client.

export type AuthProviderName = "google" | "apple";

/** Minimal shape needed to determine the sign-in provider of a user. */
export type ProviderUser = {
  app_metadata?: { provider?: unknown } | null;
  identities?: ReadonlyArray<{ provider?: unknown }> | null;
};

/**
 * Determine the primary auth provider for a user: the top-level
 * app_metadata.provider first, then any linked identity. Returns null when
 * neither Google nor Apple can be established (drives the "unknown-provider"
 * failure in destructive reauthentication).
 */
export function providerOf(
  user: ProviderUser | null | undefined
): AuthProviderName | null {
  const p = user?.app_metadata?.provider;
  if (p === "google" || p === "apple") return p;
  const ids = user?.identities ?? [];
  for (const id of ids) {
    if (id.provider === "apple") return "apple";
    if (id.provider === "google") return "google";
  }
  return null;
}
