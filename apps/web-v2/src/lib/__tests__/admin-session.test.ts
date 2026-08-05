import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mintAdminSessionToken,
  verifyAdminSessionToken,
} from "../admin-session";

const prevSession = process.env.ADMIN_SESSION_SECRET;
const prevMod = process.env.MODERATION_PASSWORD;

beforeEach(() => {
  delete process.env.ADMIN_SESSION_SECRET;
  delete process.env.MODERATION_PASSWORD;
});

afterEach(() => {
  if (prevSession === undefined) delete process.env.ADMIN_SESSION_SECRET;
  else process.env.ADMIN_SESSION_SECRET = prevSession;
  if (prevMod === undefined) delete process.env.MODERATION_PASSWORD;
  else process.env.MODERATION_PASSWORD = prevMod;
});

test("fails closed when no secret is configured", async () => {
  assert.equal(await mintAdminSessionToken(), null);
  assert.equal(await verifyAdminSessionToken("anything"), false);
  assert.equal(await verifyAdminSessionToken(null), false);
});

test("mints opaque token that is not the raw secret", async () => {
  process.env.ADMIN_SESSION_SECRET = "super-secret-session-key";
  const token = await mintAdminSessionToken();
  assert.ok(token);
  assert.notEqual(token, "super-secret-session-key");
  assert.equal(await verifyAdminSessionToken(token), true);
  assert.equal(await verifyAdminSessionToken("tampered"), false);
});

test("falls back to MODERATION_PASSWORD as HMAC key only", async () => {
  process.env.MODERATION_PASSWORD = "bootstrap-password";
  const token = await mintAdminSessionToken();
  assert.ok(token);
  assert.notEqual(token, "bootstrap-password");
  assert.equal(await verifyAdminSessionToken(token), true);
});

test("ADMIN_SESSION_SECRET takes precedence over MODERATION_PASSWORD", async () => {
  process.env.MODERATION_PASSWORD = "bootstrap-password";
  process.env.ADMIN_SESSION_SECRET = "dedicated-session-secret";
  const token = await mintAdminSessionToken();
  assert.ok(token);

  delete process.env.ADMIN_SESSION_SECRET;
  // Token minted with dedicated secret must not verify under bootstrap-only key.
  assert.equal(await verifyAdminSessionToken(token), false);
});
