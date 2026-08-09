import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(relative: string): Promise<string> {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

test("new and existing partners are fail-closed for automated RFQ delivery", async () => {
  const migration = await source("../../../supabase/migrations/037_rfq_partner_readiness.sql");
  assert.match(migration, /rfq_dispatch_enabled boolean not null default false/i);
  assert.match(migration, /rfq_opt_in_at timestamptz/i);
  assert.match(migration, /rfq_phone_verified_at timestamptz/i);
  assert.match(migration, /rfq_dispatch_enabled = false[\s\S]*is_partner = true[\s\S]*rfq_opt_in_at is not null[\s\S]*rfq_phone_verified_at is not null/i);
});

test("all routing waves select only explicitly RFQ-enabled partners", async () => {
  const router = await source("../network-quote-routing.ts");
  assert.match(router, /eq\("is_partner", true\)[\s\S]*eq\("rfq_dispatch_enabled", true\)/);
  assert.match(router, /Wave 3 is the broad partner-network safety net/);
});

test("provider send re-checks readiness after queue claim", async () => {
  const delivery = await source("../quote-delivery.ts");
  assert.match(delivery, /rfq_dispatch_enabled,rfq_opt_in_at,rfq_phone_verified_at/);
  assert.match(delivery, /readiness revoked before send/);
  assert.match(delivery, /status: "cancelled"/);
  const readinessCheck = delivery.indexOf("workshopRow.rfq_dispatch_enabled !== true");
  const providerSend = delivery.indexOf("sendWhatsAppTemplate(");
  assert.ok(readinessCheck >= 0 && providerSend >= 0 && readinessCheck < providerSend);
});

test("admin readiness UI exposes consent, phone verification, and explicit activation", async () => {
  const ui = await source("../../components/AdminPartnersClient.tsx");
  assert.match(ui, /موافقة استقبال RFQ مسجلة/);
  assert.match(ui, /رقم واتساب متحقق/);
  assert.match(ui, /تفعيل RFQ/);
  assert.match(ui, /RFQ مقفول/);
});
