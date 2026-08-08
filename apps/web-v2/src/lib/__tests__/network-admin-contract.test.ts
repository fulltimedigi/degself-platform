import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(relative: string): Promise<string> {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

test("network admin is open-ended and link-first", async () => {
  const admin = await source("../../components/AdminPartnersClient.tsx");
  const page = await source("../../app/[locale]/admin/partners/page.tsx");

  assert.doesNotMatch(admin, /TARGET\s*=\s*50/);
  assert.doesNotMatch(page, /٥٠|50/);
  assert.match(admin, /PartnerLinkImporter/);
  assert.doesNotMatch(admin, /ابحث في الدليل/);
});

test("network workshops render as verified and are visually prioritized", async () => {
  const card = await source("../../components/WorkshopCard.tsx");
  assert.match(card, /is_partner/);
  assert.match(card, /موثق/);
  assert.match(card, /order-first/);
});

test("network remains the routing source of truth", async () => {
  const partners = await source("../partners.ts");
  assert.match(partners, /partners_only:\s*true/);
  assert.match(partners, /partner_priority/);
  assert.match(partners, /fromPartners:\s*true/);
});
