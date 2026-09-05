// Pure, RN-free account-deletion contract for the mobile client. Mirrors the
// canonical server contract in apps/web-v2 (lib/account-deletion.ts +
// lib/account-deletion-core.ts) so the native Danger Zone speaks exactly the
// codes the ONE canonical server operation returns. The business rules live on
// the server; this file only holds the client-side contract constants, input
// validation, and the code → localized-message-key mapping — all pure, so they
// are unit-tested with node:test.
//
// Shared-extraction is deferred (see ADR-0003): only the string constant and an
// enum are duplicated, and the server remains the single source of truth for
// every decision. Parity is enforced by a test asserting this union matches the
// server's AccountDeleteCode.

/**
 * Canonical, translation-INDEPENDENT confirmation token the user must type.
 * Identical to the server constant; each locale instructs the user to type it
 * literally. Never localize this value.
 */
export const ACCOUNT_DELETE_CONFIRMATION = "DELETE";

/** Machine codes the canonical server operation can return. */
export type AccountDeleteCode =
  | "NOT_AUTHENTICATED"
  | "INVALID_ORIGIN" // web-only; never expected on the native Bearer path
  | "INVALID_CONFIRMATION"
  | "AUTH_TOO_OLD"
  | "RATE_LIMITED"
  | "ACCOUNT_HAS_PRIVILEGED_ROLE"
  | "ACCOUNT_HAS_CLAIMED_WORKSHOP"
  | "SERVER_ERROR";

/** Outcome of a deletion attempt, normalized for the UI. */
export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; code: AccountDeleteCode };

/** Exact confirmation match — whitespace-trimmed, case-sensitive to the token. */
export function isValidConfirmation(
  input: unknown,
  expected: string = ACCOUNT_DELETE_CONFIRMATION
): boolean {
  return typeof input === "string" && input.trim() === expected;
}

/**
 * Normalize any server/transport response into a typed result. Unknown or
 * missing codes collapse to SERVER_ERROR so the UI always has a code to map,
 * and a non-ok HTTP body without a recognized code never reads as success.
 */
export function normalizeDeleteResponse(
  httpOk: boolean,
  body: unknown
): DeleteAccountResult {
  const b = (body ?? {}) as { ok?: unknown; code?: unknown };
  if (httpOk && b.ok === true) return { ok: true };
  const code = b.code;
  if (typeof code === "string" && isAccountDeleteCode(code)) {
    return { ok: false, code };
  }
  return { ok: false, code: "SERVER_ERROR" };
}

const ALL_CODES: readonly AccountDeleteCode[] = [
  "NOT_AUTHENTICATED",
  "INVALID_ORIGIN",
  "INVALID_CONFIRMATION",
  "AUTH_TOO_OLD",
  "RATE_LIMITED",
  "ACCOUNT_HAS_PRIVILEGED_ROLE",
  "ACCOUNT_HAS_CLAIMED_WORKSHOP",
  "SERVER_ERROR",
];

export function isAccountDeleteCode(value: string): value is AccountDeleteCode {
  return (ALL_CODES as readonly string[]).includes(value);
}

/**
 * Whether a failure code means "re-authenticate with the provider and retry".
 * AUTH_TOO_OLD is the only recoverable-by-reauth code: a fresh Google/Apple
 * sign-in advances last_sign_in_at and the retry then passes the server's
 * recent-auth gate. OAuth users have no password to re-enter — so the UI must
 * drive a provider reauth, never prompt for a password.
 */
export function requiresReauth(code: AccountDeleteCode): boolean {
  return code === "AUTH_TOO_OLD";
}

/** i18n message keys the Danger Zone renders for each failure code. */
export type DeleteErrorKey =
  | "deleteErrNotAuthenticated"
  | "deleteErrInvalidConfirmation"
  | "deleteErrAuthTooOld"
  | "deleteErrRateLimited"
  | "deleteErrPrivilegedRole"
  | "deleteErrClaimedWorkshop"
  | "deleteErrGeneric";

/** Map a server code to the localized-message key the UI shows. */
export function deleteErrorKey(code: AccountDeleteCode): DeleteErrorKey {
  switch (code) {
    case "NOT_AUTHENTICATED":
      return "deleteErrNotAuthenticated";
    case "INVALID_CONFIRMATION":
      return "deleteErrInvalidConfirmation";
    case "AUTH_TOO_OLD":
      return "deleteErrAuthTooOld";
    case "RATE_LIMITED":
      return "deleteErrRateLimited";
    case "ACCOUNT_HAS_PRIVILEGED_ROLE":
      return "deleteErrPrivilegedRole";
    case "ACCOUNT_HAS_CLAIMED_WORKSHOP":
      return "deleteErrClaimedWorkshop";
    // INVALID_ORIGIN should never reach a native client; treat as generic.
    case "INVALID_ORIGIN":
    case "SERVER_ERROR":
    default:
      return "deleteErrGeneric";
  }
}
