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
 * 3) verify the identity accepted by persistent auth again;
 * 4) if that final check ever fails (or errors), roll back the promotion so a
 *    mismatched identity is never left installed in the app session.
 *
 * Step 4 is defense-in-depth — by construction the candidate id was already
 * proven equal and the same tokens are promoted — but a destructive flow must
 * not leave a wrong session live if an invariant is somehow violated.
 *
 * Callbacks keep this logic unit-testable without importing React Native or a
 * live Supabase client.
 */
export async function verifyThenPromoteReauthentication(
  expectedUserId: string,
  candidateUserId: string | null | undefined,
  promote: () => Promise<void>,
  verifyPromotedUserId: () => Promise<string | null | undefined>,
  rollbackPromotion?: () => Promise<void>
): Promise<void> {
  assertSameReauthenticatedUser(expectedUserId, candidateUserId);
  await promote();
  let promotedUserId: string | null | undefined;
  try {
    promotedUserId = await verifyPromotedUserId();
    assertSameReauthenticatedUser(expectedUserId, promotedUserId);
  } catch (error) {
    // Post-promotion check failed/errored → undo the promotion, then rethrow.
    if (rollbackPromotion) {
      try {
        await rollbackPromotion();
      } catch {
        /* best-effort: the caller still sees the original failure */
      }
    }
    throw error;
  }
}
