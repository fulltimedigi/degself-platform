// Pure, side-effect-free decision logic for POST /api/account/delete.
// No Supabase, no request objects, no DOM — so every guard boundary is
// unit-testable in isolation. The route handler wires these to real I/O.

/**
 * Canonical, translation-INDEPENDENT confirmation token the user must type.
 * The server validates against this fixed constant so the destructive contract
 * never drifts with locale copy; each locale's UI instructs the user to type it
 * literally.
 */
export const ACCOUNT_DELETE_CONFIRMATION = "DELETE";

/** Recent-authentication window for the destructive action. */
export const AUTH_FRESHNESS_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Machine codes returned to the client. The UI maps each to localized copy —
 * the strings below are contract identifiers, not user-facing text.
 */
export type AccountDeleteCode =
  | "NOT_AUTHENTICATED"
  | "INVALID_ORIGIN"
  | "INVALID_CONFIRMATION"
  | "AUTH_TOO_OLD"
  | "RATE_LIMITED"
  | "ACCOUNT_HAS_PRIVILEGED_ROLE"
  | "ACCOUNT_HAS_CLAIMED_WORKSHOP"
  | "SERVER_ERROR";

/** Exact confirmation match — whitespace-trimmed, case-sensitive to the token. */
export function isValidConfirmation(
  input: unknown,
  expected: string = ACCOUNT_DELETE_CONFIRMATION
): boolean {
  return typeof input === "string" && input.trim() === expected;
}

/** Parse a Supabase timestamp (e.g. ISO `last_sign_in_at`) to epoch ms, or null. */
export function parseTimestampMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

/**
 * Recent-auth gate. Fresh only when the last sign-in is within `thresholdMs`.
 * A missing/invalid timestamp is NOT fresh. The `last_sign_in_at` value comes
 * from the Supabase auth server (never user input), so a value at or slightly
 * ahead of `nowMs` (clock skew) is still recent.
 */
export function isAuthFresh(
  lastSignInAtMs: number | null | undefined,
  nowMs: number,
  thresholdMs: number = AUTH_FRESHNESS_MS
): boolean {
  if (typeof lastSignInAtMs !== "number" || !Number.isFinite(lastSignInAtMs)) {
    return false;
  }
  if (typeof nowMs !== "number" || !Number.isFinite(nowMs)) return false;
  return nowMs - lastSignInAtMs <= thresholdMs;
}

/**
 * Same-origin (CSRF) check for a cookie-authenticated destructive POST. The
 * Origin header must exactly match one of the allowed origins; a missing Origin
 * is rejected rather than trusted.
 */
export function isAllowedOrigin(
  originHeader: string | null | undefined,
  allowedOrigins: readonly string[]
): boolean {
  if (!originHeader) return false;
  for (const allowed of allowedOrigins) {
    if (allowed && allowed === originHeader) return true;
  }
  return false;
}

/**
 * Pre-delete blocker decision. Both states block self-service deletion; the
 * privileged-role check is reported first because it is the more
 * privilege-sensitive condition. Returns null when deletion may proceed.
 */
export function deletionBlocker(state: {
  isPrivilegedAdmin: boolean;
  hasClaimedWorkshop: boolean;
}): "ACCOUNT_HAS_PRIVILEGED_ROLE" | "ACCOUNT_HAS_CLAIMED_WORKSHOP" | null {
  if (state.isPrivilegedAdmin) return "ACCOUNT_HAS_PRIVILEGED_ROLE";
  if (state.hasClaimedWorkshop) return "ACCOUNT_HAS_CLAIMED_WORKSHOP";
  return null;
}
