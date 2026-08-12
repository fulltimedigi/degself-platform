import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSameReauthenticatedUser,
  ReauthUserMismatchError,
} from "../reauth-guard";

test("same-user reauthentication accepts only the exact Supabase user id", () => {
  assert.doesNotThrow(() => assertSameReauthenticatedUser("user-A", "user-A"));

  for (const actual of ["user-B", "", null, undefined]) {
    assert.throws(
      () => assertSameReauthenticatedUser("user-A", actual),
      ReauthUserMismatchError
    );
  }
});

test("missing expected identity fails closed", () => {
  assert.throws(
    () => assertSameReauthenticatedUser("", "user-A"),
    ReauthUserMismatchError
  );
});
