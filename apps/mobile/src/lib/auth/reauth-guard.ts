export class ReauthUserMismatchError extends Error {
  constructor() {
    super("reauth-user-mismatch");
    this.name = "ReauthUserMismatchError";
  }
}

/**
 * Reauthentication is only valid when the provider flow resolves to the exact
 * Supabase user that initiated the destructive action. OAuth account pickers
 * can return a different account; never let that silently replace the identity
 * whose deletion was being confirmed.
 */
export function assertSameReauthenticatedUser(
  expectedUserId: string,
  actualUserId: string | null | undefined
): void {
  if (!expectedUserId || actualUserId !== expectedUserId) {
    throw new ReauthUserMismatchError();
  }
}
