// Canonical, transport-agnostic account-deletion business operation.
//
// This is the ONE place the destructive sequence lives. Each transport — the
// web cookie adapter and the mobile Bearer adapter, both in
// app/api/account/delete/route.ts — authenticates the caller its own way, then
// hands a *server-verified* identity to performAccountDeletion(). Typed
// confirmation, recent-auth, fail-closed rate limit, privileged/claimed
// blockers, and auth.admin.deleteUser are all enforced here, identically for
// every transport, so a second client can never evolve its own weaker rules.
//
// SERVER ONLY — imports the service-role admin client. Never import from a
// client component.

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  isValidConfirmation,
  isAuthFresh,
  parseTimestampMs,
  deletionBlocker,
  type AccountDeleteCode,
} from "@/lib/account-deletion";

/** Attempts allowed per (user, network) per hour for this destructive action. */
export const ACCOUNT_DELETE_RATE_LIMIT_PER_HOUR = 5;

export type AccountDeletionResult =
  | { ok: true }
  | { ok: false; code: AccountDeleteCode; status: number };

export type AccountDeletionInput = {
  /** Server-verified user id (cookie session or verified Bearer token). */
  userId: string;
  /**
   * Server-sourced last-sign-in timestamp for the recent-auth gate. Comes from
   * the Supabase auth user object (`getUser()` on cookies or `getUser(token)`
   * on a Bearer JWT) — NEVER a client-supplied value.
   */
  lastSignInAt: unknown;
  /** Typed confirmation token from the request body. */
  confirmation: unknown;
  /**
   * Rate-limit key: server-derived identity + network signal (`${userId}:${ip}`).
   * Per-user scoping keeps shared-NAT native clients from colliding across
   * accounts, while a single account still cannot exceed the per-hour ceiling.
   */
  rateLimitKey: string;
  /** Injectable clock for tests. */
  now?: number;
};

function fail(code: AccountDeleteCode, status: number): AccountDeletionResult {
  return { ok: false, code, status };
}

/**
 * Run the canonical deletion sequence for an already-authenticated identity.
 * Order mirrors the original route exactly, minus the transport-specific auth
 * and same-origin steps the adapter performs first:
 *   confirmation → recent-auth → rate limit → blockers → deleteUser.
 */
export async function performAccountDeletion(
  input: AccountDeletionInput
): Promise<AccountDeletionResult> {
  // Typed, translation-free confirmation.
  if (!isValidConfirmation(input.confirmation)) {
    return fail("INVALID_CONFIRMATION", 400);
  }

  // Recent-auth gate. Equally server-verifiable on native: a token *refresh*
  // does not advance last_sign_in_at, so a long-lived refreshed session still
  // requires a fresh provider sign-in to delete — identical semantics to web.
  const nowMs = input.now ?? Date.now();
  if (!isAuthFresh(parseTimestampMs(input.lastSignInAt), nowMs)) {
    return fail("AUTH_TOO_OLD", 401);
  }

  // Fail-closed rate limit (deny if the limiter backend is unavailable).
  const allowed = await consumeRateLimit(
    input.rateLimitKey,
    "account_delete",
    ACCOUNT_DELETE_RATE_LIMIT_PER_HOUR,
    { failClosed: true }
  );
  if (!allowed) return fail("RATE_LIMITED", 429);

  // Pre-delete blockers via the service-role boundary. These ownership /
  // privilege states are resolved by separate workflows, never silently
  // mutated as a side effect of account deletion.
  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return fail("SERVER_ERROR", 500);
  }

  let isPrivilegedAdmin = false;
  let hasClaimedWorkshop = false;
  try {
    const { data: adminRow, error: adminErr } = await admin
      .from("admins")
      .select("user_id")
      .eq("user_id", input.userId)
      .maybeSingle();
    if (adminErr) throw adminErr;
    isPrivilegedAdmin = Boolean(adminRow);

    const { data: claimed, error: claimErr } = await admin
      .from("workshops")
      .select("place_id")
      .eq("claimed_by", input.userId)
      .limit(1);
    if (claimErr) throw claimErr;
    hasClaimedWorkshop = Array.isArray(claimed) && claimed.length > 0;
  } catch (e) {
    console.error("account-delete blocker check failed:", e);
    return fail("SERVER_ERROR", 500);
  }

  const blocker = deletionBlocker({ isPrivilegedAdmin, hasClaimedWorkshop });
  if (blocker) return fail(blocker, 409);

  // Delete the Auth identity itself. profiles + user_favorites cascade; eligible
  // community_mentions survive with matched_by = NULL (migration 035);
  // auth.sessions + auth.refresh_tokens cascade (server-side session death, so
  // a native access token can no longer be refreshed).
  try {
    const { error: delErr } = await admin.auth.admin.deleteUser(input.userId);
    if (delErr) throw delErr;
  } catch (e) {
    console.error("account-delete auth.admin.deleteUser failed:", e);
    return fail("SERVER_ERROR", 500);
  }

  return { ok: true };
}
