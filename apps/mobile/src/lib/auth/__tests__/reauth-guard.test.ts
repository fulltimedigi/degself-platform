import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSameReauthenticatedUser,
  ReauthUserMismatchError,
  verifyThenPromoteReauthentication,
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

test("wrong candidate is rejected before persistent session promotion", async () => {
  let promoted = false;
  await assert.rejects(
    verifyThenPromoteReauthentication(
      "user-A",
      "user-B",
      async () => {
        promoted = true;
      },
      async () => "user-B"
    ),
    ReauthUserMismatchError
  );
  assert.equal(promoted, false);
});

test("promotion is verified again after persistent auth accepts it", async () => {
  const order: string[] = [];
  await verifyThenPromoteReauthentication(
    "user-A",
    "user-A",
    async () => {
      order.push("promote");
    },
    async () => {
      order.push("verify");
      return "user-A";
    }
  );
  assert.deepEqual(order, ["promote", "verify"]);
});

test("post-promotion identity mismatch still fails closed", async () => {
  await assert.rejects(
    verifyThenPromoteReauthentication(
      "user-A",
      "user-A",
      async () => {},
      async () => "user-B"
    ),
    ReauthUserMismatchError
  );
});
