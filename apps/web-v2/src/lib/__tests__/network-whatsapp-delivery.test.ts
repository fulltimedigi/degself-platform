import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(relative: string): Promise<string> {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

test("automatic garage send runs after the durable quote response path", async () => {
  const route = await source("../../app/api/quotes/route.ts");
  assert.match(route, /after\(async \(\) =>/);
  assert.match(route, /dispatchQuoteDeliveryQueue\(inserted\.id\)/);
  assert.match(route, /WHATSAPP_ENABLED/);
});

test("garage RFQ requires an explicitly configured template and provider timeout", async () => {
  const wa = await source("../whatsapp.ts");
  assert.match(wa, /WHATSAPP_TEMPLATE_GARAGE_RFQ/);
  assert.match(wa, /return value \|\| null/);
  assert.match(wa, /AbortSignal\.timeout\(WA_TIMEOUT_MS\)/);
  assert.match(wa, /garageQuoteTemplateComponents/);
});

test("reserved delivery token is not outreach until provider success", async () => {
  const migration = await source("../../../supabase/migrations/034_network_delivery_tokens.sql");
  const delivery = await source("../quote-delivery.ts");
  const resolver = await source("../garage-outreach.ts");

  assert.match(migration, /delivery_token/);
  assert.match(migration, /not valid until provider delivery succeeds/i);
  assert.match(delivery, /eq\("delivery_token", token\)[\s\S]*eq\("status", "sent"\)/);
  assert.match(resolver, /materializeSentDeliveryOutreachByToken\(token\)/);

  const sendIndex = delivery.indexOf("sendWhatsAppTemplate(");
  const sentIndex = delivery.indexOf('status: "sent"', sendIndex);
  const outreachIndex = delivery.indexOf("materializeSentDeliveryOutreach({", sentIndex);
  assert.ok(sendIndex >= 0 && sentIndex > sendIndex && outreachIndex > sentIndex);
});

test("provider success can be reconciled without duplicate send", async () => {
  const delivery = await source("../quote-delivery.ts");
  assert.match(delivery, /Atomic claim: only one worker can move queued -> sending/);
  assert.match(delivery, /eq\("status", "queued"\)/);
  assert.match(delivery, /Do NOT retry automatically/);
  assert.match(delivery, /reconcileSentDeliveries/);
  assert.match(delivery, /last_outreach_at !== input\.sentAt/);
});

test("Meta receipts are attributed to the garage queue before customer messages", async () => {
  const webhook = await source("../../app/api/webhooks/whatsapp/route.ts");
  const migration = await source("../../../supabase/migrations/034_network_delivery_tokens.sql");
  assert.match(webhook, /from\("quote_delivery_queue"\)/);
  assert.match(webhook, /eq\("provider_message_id", s\.id\)/);
  assert.match(webhook, /delivered_at/);
  assert.match(webhook, /read_at/);
  assert.match(webhook, /failed_at/);
  assert.match(migration, /quote_delivery_queue_provider_message_idx/);
  const garageLookup = webhook.indexOf('from("quote_delivery_queue")');
  const customerLookup = webhook.indexOf('from("quotes")', garageLookup);
  assert.ok(garageLookup >= 0 && customerLookup > garageLookup);
});

test("garage WhatsApp template contains no customer identity or problem description", async () => {
  const delivery = await source("../quote-delivery.ts");
  const wa = await source("../whatsapp.ts");
  assert.doesNotMatch(delivery, /customer_name|customer_phone|problem_description/);
  const start = wa.indexOf("export function garageQuoteTemplateComponents");
  const end = wa.indexOf("export function garageOfferUrl", start);
  const builder = wa.slice(start, end);
  assert.doesNotMatch(builder, /customer|phone|problem/i);
  assert.match(builder, /service/);
  assert.match(builder, /car/);
  assert.match(builder, /area/);
  assert.match(builder, /token/);
});
