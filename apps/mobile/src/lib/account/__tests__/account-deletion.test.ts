import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACCOUNT_DELETE_CONFIRMATION,
  deleteErrorKey,
  isAccountDeleteCode,
  isValidConfirmation,
  normalizeDeleteResponse,
  requiresReauth,
  type AccountDeleteCode,
} from "../account-deletion";

test("isValidConfirmation requires the exact canonical token (trim-forgiving)", () => {
  assert.equal(isValidConfirmation(ACCOUNT_DELETE_CONFIRMATION), true);
  assert.equal(isValidConfirmation("  DELETE  "), true);
  assert.equal(isValidConfirmation("delete"), false); // case-sensitive
  assert.equal(isValidConfirmation("DELET"), false);
  assert.equal(isValidConfirmation("احذف"), false); // never localized
  assert.equal(isValidConfirmation(""), false);
  assert.equal(isValidConfirmation(undefined), false);
  assert.equal(isValidConfirmation(42), false);
});

// The union MUST match the canonical server contract exactly. If the server adds
// or renames a code, this list (and the UI mapping) must be updated in lockstep.
test("account delete code set mirrors the server contract", () => {
  const expected: AccountDeleteCode[] = [
    "NOT_AUTHENTICATED",
    "INVALID_ORIGIN",
    "INVALID_CONFIRMATION",
    "AUTH_TOO_OLD",
    "RATE_LIMITED",
    "ACCOUNT_HAS_PRIVILEGED_ROLE",
    "ACCOUNT_HAS_CLAIMED_WORKSHOP",
    "SERVER_ERROR",
  ];
  for (const c of expected) assert.equal(isAccountDeleteCode(c), true);
  assert.equal(isAccountDeleteCode("WHATEVER"), false);
});

test("normalizeDeleteResponse only reads success from an ok:true body with HTTP ok", () => {
  assert.deepEqual(normalizeDeleteResponse(true, { ok: true }), { ok: true });
  // HTTP ok but ok !== true → not success
  assert.deepEqual(normalizeDeleteResponse(true, { ok: false, code: "SERVER_ERROR" }), {
    ok: false,
    code: "SERVER_ERROR",
  });
  // known failure code passes through
  assert.deepEqual(normalizeDeleteResponse(false, { ok: false, code: "AUTH_TOO_OLD" }), {
    ok: false,
    code: "AUTH_TOO_OLD",
  });
  // unknown / missing code collapses to SERVER_ERROR — never silent success
  assert.deepEqual(normalizeDeleteResponse(false, { ok: false, code: "???" }), {
    ok: false,
    code: "SERVER_ERROR",
  });
  assert.deepEqual(normalizeDeleteResponse(false, null), { ok: false, code: "SERVER_ERROR" });
  assert.deepEqual(normalizeDeleteResponse(true, "not-an-object"), {
    ok: false,
    code: "SERVER_ERROR",
  });
});

test("requiresReauth is true only for AUTH_TOO_OLD", () => {
  assert.equal(requiresReauth("AUTH_TOO_OLD"), true);
  assert.equal(requiresReauth("RATE_LIMITED"), false);
  assert.equal(requiresReauth("ACCOUNT_HAS_CLAIMED_WORKSHOP"), false);
  assert.equal(requiresReauth("INVALID_CONFIRMATION"), false);
});

test("deleteErrorKey maps every code to a message key (INVALID_ORIGIN → generic)", () => {
  assert.equal(deleteErrorKey("NOT_AUTHENTICATED"), "deleteErrNotAuthenticated");
  assert.equal(deleteErrorKey("INVALID_CONFIRMATION"), "deleteErrInvalidConfirmation");
  assert.equal(deleteErrorKey("AUTH_TOO_OLD"), "deleteErrAuthTooOld");
  assert.equal(deleteErrorKey("RATE_LIMITED"), "deleteErrRateLimited");
  assert.equal(deleteErrorKey("ACCOUNT_HAS_PRIVILEGED_ROLE"), "deleteErrPrivilegedRole");
  assert.equal(deleteErrorKey("ACCOUNT_HAS_CLAIMED_WORKSHOP"), "deleteErrClaimedWorkshop");
  assert.equal(deleteErrorKey("SERVER_ERROR"), "deleteErrGeneric");
  assert.equal(deleteErrorKey("INVALID_ORIGIN"), "deleteErrGeneric");
});
