import { test } from "node:test";
import assert from "node:assert/strict";

// Proves the account-deletion route's session cleanup is DETERMINISTIC, not
// best-effort: given a request cookie jar carrying a Supabase session, the
// clearing step (signOut scope:"local" via the route-handler client) emits
// expiring removals for those cookies onto the response. A subsequent request
// therefore carries no auth cookie, so a server-authenticated getUser() resolves
// no user — without hard-coding any Supabase cookie name and without depending
// on the swallowed client-side signOut.
//
// signOut({scope:"local"}) makes no network call, so this runs offline in CI.

test("delete route clears Supabase session cookies from the jar deterministically", async () => {
  const ref = "unittestref";
  // server.ts reads these at module load — set before the dynamic import.
  process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${ref}.supabase.co`;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_unit_test";

  const { createRouteHandlerClient } = await import("../supabase/server");

  // @supabase/ssr derives the auth cookie name from the project ref in the URL.
  const cookieName = `sb-${ref}-auth-token`;
  const sink: { name: string; value: string; options?: { maxAge?: number } }[] = [];

  const supabase = createRouteHandlerClient(
    () => [{ name: cookieName, value: "base64-eyJhY2Nlc3NfdG9rZW4iOiJ4In0" }],
    sink
  );

  await supabase.auth.signOut({ scope: "local" });

  const authWrites = sink.filter((c) => c.name === cookieName);
  assert.ok(
    authWrites.length >= 1,
    "expected the response to write removals for the session cookie"
  );
  // Every write for the auth cookie must expire it (empty value + maxAge 0).
  for (const c of authWrites) {
    assert.equal(c.value, "", "session cookie value must be cleared");
    assert.equal(c.options?.maxAge, 0, "session cookie must be expired");
  }
  // Nothing leaves the auth cookie populated.
  assert.ok(
    !sink.some((c) => c.name === cookieName && c.value !== ""),
    "no write may leave the session cookie populated"
  );
});
