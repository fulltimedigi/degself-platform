import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACCOUNT_DELETE_CONFIRMATION,
  AUTH_FRESHNESS_MS,
  isValidConfirmation,
  parseTimestampMs,
  isAuthFresh,
  isAllowedOrigin,
  deletionBlocker,
} from "../account-deletion";

test("isValidConfirmation requires the exact canonical token (trim-forgiving)", () => {
  assert.equal(isValidConfirmation(ACCOUNT_DELETE_CONFIRMATION), true);
  assert.equal(isValidConfirmation(`  ${ACCOUNT_DELETE_CONFIRMATION}  `), true);
  // wrong case / partial / translated / empty all fail
  assert.equal(isValidConfirmation("delete"), false);
  assert.equal(isValidConfirmation("DELET"), false);
  assert.equal(isValidConfirmation("احذف"), false);
  assert.equal(isValidConfirmation(""), false);
  // non-string inputs (boolean checkbox, missing) never validate
  assert.equal(isValidConfirmation(true), false);
  assert.equal(isValidConfirmation(1), false);
  assert.equal(isValidConfirmation(undefined), false);
  assert.equal(isValidConfirmation(null), false);
});

test("parseTimestampMs handles ISO strings, epoch numbers, and junk", () => {
  assert.equal(parseTimestampMs("2026-08-08T00:00:00.000Z"), Date.parse("2026-08-08T00:00:00.000Z"));
  assert.equal(parseTimestampMs(1_700_000_000_000), 1_700_000_000_000);
  assert.equal(parseTimestampMs(""), null);
  assert.equal(parseTimestampMs("   "), null);
  assert.equal(parseTimestampMs("not a date"), null);
  assert.equal(parseTimestampMs(null), null);
  assert.equal(parseTimestampMs(undefined), null);
  assert.equal(parseTimestampMs(NaN), null);
});

test("isAuthFresh gates at exactly the 10-minute boundary", () => {
  const now = 1_000_000_000_000;
  // just under threshold → fresh
  assert.equal(isAuthFresh(now - (AUTH_FRESHNESS_MS - 1), now), true);
  // exactly at threshold → still fresh (<=)
  assert.equal(isAuthFresh(now - AUTH_FRESHNESS_MS, now), true);
  // just over threshold → stale
  assert.equal(isAuthFresh(now - (AUTH_FRESHNESS_MS + 1), now), false);
  // clock skew: sign-in slightly ahead of now is still recent
  assert.equal(isAuthFresh(now + 1000, now), true);
  // missing / invalid timestamp → not fresh
  assert.equal(isAuthFresh(null, now), false);
  assert.equal(isAuthFresh(undefined, now), false);
  assert.equal(isAuthFresh(NaN, now), false);
  assert.equal(isAuthFresh(now, NaN), false);
});

test("isAllowedOrigin is same-origin only and rejects a missing Origin", () => {
  const allow = ["https://degself.com", "https://preview.vercel.app"];
  assert.equal(isAllowedOrigin("https://degself.com", allow), true);
  assert.equal(isAllowedOrigin("https://preview.vercel.app", allow), true);
  // cross-site attacker origin
  assert.equal(isAllowedOrigin("https://evil.example", allow), false);
  // missing Origin header is rejected, not trusted
  assert.equal(isAllowedOrigin(null, allow), false);
  assert.equal(isAllowedOrigin("", allow), false);
  assert.equal(isAllowedOrigin(undefined, allow), false);
  // empty allow-list never matches
  assert.equal(isAllowedOrigin("https://degself.com", []), false);
});

test("deletionBlocker: privileged role wins, then claimed workshop, else null", () => {
  assert.equal(
    deletionBlocker({ isPrivilegedAdmin: true, hasClaimedWorkshop: false }),
    "ACCOUNT_HAS_PRIVILEGED_ROLE"
  );
  assert.equal(
    deletionBlocker({ isPrivilegedAdmin: false, hasClaimedWorkshop: true }),
    "ACCOUNT_HAS_CLAIMED_WORKSHOP"
  );
  // privileged role reported first when both are present
  assert.equal(
    deletionBlocker({ isPrivilegedAdmin: true, hasClaimedWorkshop: true }),
    "ACCOUNT_HAS_PRIVILEGED_ROLE"
  );
  // clean account → no blocker
  assert.equal(
    deletionBlocker({ isPrivilegedAdmin: false, hasClaimedWorkshop: false }),
    null
  );
});
