import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(relative: string): Promise<string> {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

test("quote API sources stay compatible with the database constraint", async () => {
  const route = await source("../../app/api/quotes/route.ts");
  const migration = await source("../../../supabase/migrations/025_quote_sources_and_legacy_rate_limit_cleanup.sql");
  const expected = ["quote_bar", "translator", "asaali", "concierge"];

  for (const value of expected) {
    assert.match(route, new RegExp(`[\"']${value}[\"']`));
    assert.match(migration, new RegExp(`[\"']${value}[\"']`));
  }
});

test("global language switcher does not force static pages to client render", async () => {
  const switcher = await source("../../components/LanguageSwitcher.tsx");
  assert.doesNotMatch(switcher, /import[^\n]*useSearchParams/);
  assert.match(switcher, /window\.location\.search/);
});

test("internal SECURITY DEFINER trigger helpers are revoked from public roles", async () => {
  const migration = await source("../../../supabase/migrations/026_revoke_internal_trigger_functions.sql");
  assert.match(migration, /handle_new_user/);
  assert.match(migration, /profiles_guard_columns/);
  assert.match(migration, /revoke all on function/);
  assert.match(migration, /public, anon, authenticated/);
});
