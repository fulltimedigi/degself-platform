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

test("Next 16 request boundary uses proxy and framework-managed asset caching", async () => {
  const proxy = await source("../../proxy.ts");
  const config = await source("../../../next.config.ts");
  assert.match(proxy, /export async function proxy/);
  assert.doesNotMatch(config, /source:\s*[\"']\/_next\/static/);
});

test("login divider never renders a raw translation key", async () => {
  const login = await source("../../app/[locale]/login/page.tsx");
  assert.match(login, /OR_LABEL/);
  assert.doesNotMatch(login, /t\([\"']or[\"']\)/);
});

test("Asaali budget guard RPC exists and stays service-role only", async () => {
  const guard = await source("../asaali-cost-guard.ts");
  const migration = await source("../../../supabase/migrations/027_restore_asaali_budget_rpcs.sql");

  assert.match(guard, /rpc\([\"']asaali_current_month_cost[\"']\)/);
  assert.match(migration, /create or replace function public\.asaali_current_month_cost\(\)/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /cache_hit is not true/);
  assert.match(migration, /revoke all on function public\.asaali_current_month_cost\(\) from anon, authenticated/);
  assert.match(migration, /grant execute on function public\.asaali_current_month_cost\(\) to service_role/);
});
