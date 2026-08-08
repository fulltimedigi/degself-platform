import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(relative: string): Promise<string> {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

test("new quotes auto-route into the network delivery queue", async () => {
  const route = await source("../../app/api/quotes/route.ts");
  assert.match(route, /enqueueNetworkQuoteTargets/);
  assert.match(route, /limit:\s*5/);
  assert.match(route, /quote retained/);
});

test("routing is network-only and supports general-maintenance fallback", async () => {
  const router = await source("../network-quote-routing.ts");
  assert.match(router, /eq\("is_partner", true\)/);
  assert.match(router, /صيانة عامة/);
  assert.match(router, /partner_priority/);
  assert.match(router, /نفس المنطقة/);
});

test("selection never masquerades as successful outreach", async () => {
  const router = await source("../network-quote-routing.ts");
  const migration = await source("../../../supabase/migrations/033_network_delivery_queue.sql");
  assert.match(router, /quote_delivery_queue/);
  assert.doesNotMatch(router, /from\("quote_workshop_outreach"\)/);
  assert.match(migration, /successful provider send must create\/link measured outreach/i);
  assert.match(migration, /outreach_id uuid references public\.quote_workshop_outreach/);
});

test("delivery queue is backend-only and idempotent per quote/workshop", async () => {
  const migration = await source("../../../supabase/migrations/033_network_delivery_queue.sql");
  assert.match(migration, /unique \(quote_id, workshop_id\)/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.quote_delivery_queue from anon, authenticated/);
});
