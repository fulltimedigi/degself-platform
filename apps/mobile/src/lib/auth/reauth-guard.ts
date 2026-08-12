export class ReauthUserMismatchError extends Error {
  constructor() {
    super("reauth-user-mismatch");
    this.name = "ReauthUserMismatchError";
  }
}

/** Exact identity gate for provider reauthentication. */
export function assertSameReauthenticatedUser(
  expectedUserId: string,
  actualUserId: string | null | undefined
): void {
  if (!expectedUserId || actualUserId !== expectedUserId) {
    throw new ReauthUserMismatchError();
  }
}

/**
 * Safety-critical ordering for destructive reauthentication:
 * 1) reject a wrong candidate before any persistent auth mutation;
 * 2) promote the fresh session;
 * 3) verify the identity accepted by persistent auth again.
 *
 * Callbacks keep this logic unit-testable without importing React Native or a
 * live Supabase client.
 */
export async function verifyThenPromoteReauthentication(
  expectedUserId: string,
  candidateUserId: string | null | undefined,
  promote: () => Promise<void>,
  verifyPromotedUserId: () => Promise<string | null | undefined>
): Promise<void> {
  assertSameReauthenticatedUser(expectedUserId, candidateUserId);
  await promote();
  assertSameReauthenticatedUser(
    expectedUserId,
    await verifyPromotedUserId()
  );
}
