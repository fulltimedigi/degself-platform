import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(relative: string): Promise<string> {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

test("CallMeBot is explicitly admin-only and blocks garage capability URLs", async () => {
  const callmebot = await source("../callmebot.ts");
  assert.match(callmebot, /ADMIN-ONLY CallMeBot sender/);
  assert.match(callmebot, /\/submit-offer\\\//);
  assert.match(callmebot, /garage_rfq_forbidden/);
});

test("new quote keeps admin alert separate from Meta garage delivery", async () => {
  const quoteRoute = await source("../../app/api/quotes/route.ts");
  assert.match(quoteRoute, /dispatchQuoteDeliveryQueue\(inserted\.id\)/);
  assert.match(quoteRoute, /sendAdminWhatsApp\(lines\.join\("\\n"\)\)/);
  assert.match(quoteRoute, /إشعار إداري فقط/);
  assert.match(quoteRoute, /ليس طلب عرض سعر للكراج/);
  assert.match(quoteRoute, /\/admin\/quotes\//);
  assert.doesNotMatch(quoteRoute, /lines\.push\([^\n]*\/submit-offer\//);
});

test("garage WABA path owns the public capability URL", async () => {
  const whatsapp = await source("../whatsapp.ts");
  const delivery = await source("../quote-delivery.ts");
  assert.match(whatsapp, /garageQuoteTemplateComponents/);
  assert.match(whatsapp, /\/submit-offer\/\$\{token\}/);
  assert.match(delivery, /sendWhatsAppTemplate\(/);
  assert.doesNotMatch(delivery, /callmebot/i);
  assert.doesNotMatch(delivery, /sendAdminWhatsApp/);
});
