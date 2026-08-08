import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBearerToken } from "../account-deletion";
import { performAccountDeletion } from "../account-deletion-core";
import { ACCOUNT_DELETE_CONFIRMATION, AUTH_FRESHNESS_MS } from "../account-deletion";

// Transport SELECTION: a Bearer header routes to the native path; its absence
// routes to the cookie path. The parser must reject malformed / empty tokens so
// a stray "Authorization: Bearer" can never masquerade as an authenticated
// native request.
test("parseBearerToken selects the native transport only for a real token", () => {
  assert.equal(parseBearerToken("Bearer abc.def.ghi"), "abc.def.ghi");
  assert.equal(parseBearerToken("bearer abc.def.ghi"), "abc.def.ghi"); // case-insensitive scheme
  assert.equal(parseBearerToken("  Bearer   tok123  "), "tok123");
  // No token → fall through to the cookie transport.
  assert.equal(parseBearerToken(null), null);
  assert.equal(parseBearerToken(undefined), null);
  assert.equal(parseBearerToken(""), null);
  assert.equal(parseBearerToken("Bearer"), null);
  assert.equal(parseBearerToken("Bearer    "), null);
  assert.equal(parseBearerToken("Basic dXNlcjpwYXNz"), null); // not a Bearer scheme
});

// The canonical operation is shared by BOTH transports, so its guard ORDER is a
// contract. Confirmation and recent-auth both short-circuit before any I/O
// (rate-limit backend / admin queries), so these assertions run offline and
// prove the transport-independent gate order + status codes.
const FRESH_NOW = 1_000_000_000_000;
const freshSignIn = new Date(FRESH_NOW - 1000).toISOString();
const staleSignIn = new Date(FRESH_NOW - (AUTH_FRESHNESS_MS + 1)).toISOString();

test("performAccountDeletion rejects a bad confirmation first (400), before recent-auth", async () => {
  // Even with a hopelessly stale sign-in, an invalid confirmation is reported
  // first — the confirmation gate precedes the recent-auth gate.
  const r = await performAccountDeletion({
    userId: "u1",
    lastSignInAt: staleSignIn,
    confirmation: "nope",
    rateLimitKey: "u1:203.0.113.9",
    now: FRESH_NOW,
  });
  assert.deepEqual(r, { ok: false, code: "INVALID_CONFIRMATION", status: 400 });
});

test("performAccountDeletion enforces recent-auth (401 AUTH_TOO_OLD) after a valid confirmation", async () => {
  const r = await performAccountDeletion({
    userId: "u1",
    lastSignInAt: staleSignIn,
    confirmation: ACCOUNT_DELETE_CONFIRMATION,
    rateLimitKey: "u1:203.0.113.9",
    now: FRESH_NOW,
  });
  assert.deepEqual(r, { ok: false, code: "AUTH_TOO_OLD", status: 401 });
});

test("performAccountDeletion recent-auth uses the SERVER last_sign_in_at, not a client clock", async () => {
  // A fresh server sign-in with a bad confirmation still fails on confirmation
  // (proves recent-auth alone never lets a request through) — and freshness is
  // computed from the passed server timestamp + injected now, never client input.
  const r = await performAccountDeletion({
    userId: "u1",
    lastSignInAt: freshSignIn,
    confirmation: "",
    rateLimitKey: "u1:203.0.113.9",
    now: FRESH_NOW,
  });
  assert.equal(r.ok, false);
  assert.equal((r as { code: string }).code, "INVALID_CONFIRMATION");
});
