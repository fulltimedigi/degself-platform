import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(relative: string): Promise<string> {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

test("RFQ routing has three private waves with conservative timing", async () => {
  const router = await source("../network-quote-routing.ts");
  assert.match(router, /Wave 1 = precision, Wave 2 = recall, Wave 3 = marketplace safety net/);
  assert.match(router, /RFQ_WAVE2_AFTER_MINUTES = 15/);
  assert.match(router, /RFQ_WAVE3_AFTER_MINUTES = 30/);
  assert.match(router, /RFQ_TARGET_OFFERS = 3/);
  assert.match(router, /RFQ_ROUTING_WINDOW_MINUTES = 120/);
});

test("Wave 1 is strict, Wave 2 broadens by mapped specialties, Wave 3 never requires a specialty match", async () => {
  const router = await source("../network-quote-routing.ts");
  assert.match(router, /if \(wave === 1\)[\s\S]*mapping\.precision\.includes\(specialty\)/);
  assert.match(router, /else if \(wave === 2\)[\s\S]*mapping\.recall\.includes\(specialty\)/);
  assert.match(router, /Wave 3 is the broad partner-network safety net/);
  assert.match(router, /eq\("is_partner", true\)/);
  assert.match(router, /excludePlaceIds/);
});

test("each queued target records its wave and remains unique by quote/workshop", async () => {
  const router = await source("../network-quote-routing.ts");
  const migration = await source("../../../supabase/migrations/038_rfq_multi_wave_routing.sql");
  const baseMigration = await source("../../../supabase/migrations/033_network_delivery_queue.sql");
  assert.match(router, /routing_wave: wave/);
  assert.match(router, /onConflict: "quote_id,workshop_id"/);
  assert.match(migration, /routing_wave smallint not null default 1/);
  assert.match(migration, /routing_wave between 1 and 3/);
  assert.match(baseMigration, /unique \(quote_id, workshop_id\)/);
});

test("orchestrator stops expansion after enough offers and cancels unsent rows", async () => {
  const orchestrator = await source("../rfq-wave-orchestrator.ts");
  assert.match(orchestrator, /offers >= RFQ_TARGET_OFFERS/);
  assert.match(orchestrator, /status: "cancelled"/);
  assert.match(orchestrator, /age >= RFQ_WAVE2_AFTER_MINUTES/);
  assert.match(orchestrator, /age >= RFQ_WAVE3_AFTER_MINUTES/);
  assert.match(orchestrator, /excludePlaceIds/);
});

test("scheduler cannot bypass WABA kill switch and is protected by CRON_SECRET", async () => {
  const orchestrator = await source("../rfq-wave-orchestrator.ts");
  const delivery = await source("../quote-delivery.ts");
  const cron = await source("../../app/api/cron/rfq-wave-routing/route.ts");
  assert.match(orchestrator, /dispatchQuoteDeliveryQueue/);
  assert.match(delivery, /if \(!isWhatsAppEnabled\(\) \|\| !garageQuoteTemplateName\(\)\) return/);
  assert.match(cron, /CRON_SECRET/);
  assert.match(cron, /Unauthorized/);
});

test("multi-wave RFQ remains private 1:1 rather than group distribution", async () => {
  const router = await source("../network-quote-routing.ts");
  const delivery = await source("../quote-delivery.ts");
  assert.match(router, /private 1:1 delivery/);
  assert.match(delivery, /sendWhatsAppTemplate/);
  assert.doesNotMatch(delivery, /group_id|groupId|community_id|communityId/);
});
