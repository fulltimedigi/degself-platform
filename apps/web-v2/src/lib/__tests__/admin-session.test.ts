import { test, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import {
  mintAdminSessionToken,
  verifyAdminSessionToken,
  clearSessionEpochCache,
} from "../admin-session";

const prevSession = process.env.ADMIN_SESSION_SECRET;
const prevMod = process.env.MODERATION_PASSWORD;
const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const prevKey = process.env.SUPABASE_SECRET_KEY;
const prevService = process.env.SUPABASE_SERVICE_ROLE_KEY;

function mockEpoch(epoch: number) {
  const fetchMock = mock.method(globalThis, "fetch", async () => {
    return new Response(JSON.stringify([{ session_epoch: epoch }]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  return fetchMock;
}

beforeEach(() => {
  clearSessionEpochCache();
  delete process.env.ADMIN_SESSION_SECRET;
  delete process.env.MODERATION_PASSWORD;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

afterEach(() => {
  clearSessionEpochCache();
  mock.restoreAll();
  if (prevSession === undefined) delete process.env.ADMIN_SESSION_SECRET;
  else process.env.ADMIN_SESSION_SECRET = prevSession;
  if (prevMod === undefined) delete process.env.MODERATION_PASSWORD;
  else process.env.MODERATION_PASSWORD = prevMod;
  if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
  if (prevKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
  else process.env.SUPABASE_SECRET_KEY = prevKey;
  if (prevService === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = prevService;
});

test("fails closed when no secret is configured", async () => {
  assert.equal(await mintAdminSessionToken(1), null);
  assert.equal(await verifyAdminSessionToken("1.anything"), false);
});

test("mints epoch-bound token that is not the raw secret", async () => {
  process.env.ADMIN_SESSION_SECRET = "super-secret-session-key";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "service-role";
  mockEpoch(1);

  const token = await mintAdminSessionToken(1);
  assert.ok(token);
  assert.match(token!, /^1\.[0-9a-f]{64}$/);
  assert.notEqual(token, "super-secret-session-key");
  assert.equal(await verifyAdminSessionToken(token), true);
  assert.equal(await verifyAdminSessionToken("1.tampered"), false);
});

test("rejects token after session_epoch rotation", async () => {
  process.env.ADMIN_SESSION_SECRET = "super-secret-session-key";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "service-role";

  mockEpoch(1);
  const oldToken = await mintAdminSessionToken(1);
  assert.ok(oldToken);

  clearSessionEpochCache();
  mock.restoreAll();
  mockEpoch(2);

  assert.equal(await verifyAdminSessionToken(oldToken), false);
  const fresh = await mintAdminSessionToken(2);
  assert.equal(await verifyAdminSessionToken(fresh), true);
});

test("rejects legacy password-shaped cookies without epoch prefix", async () => {
  process.env.ADMIN_SESSION_SECRET = "super-secret-session-key";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "service-role";
  mockEpoch(1);
  assert.equal(await verifyAdminSessionToken("deadbeef".repeat(8)), false);
});
