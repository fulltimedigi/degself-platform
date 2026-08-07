import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(relative: string): Promise<string> {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

test("quote routing foundation prefers the network before directory fallback", async () => {
  const partners = await source("../partners.ts");
  assert.match(partners, /partners_only:\s*true/);
  assert.match(partners, /if \(partners\.workshops\.length > 0\)/);
  assert.match(partners, /partner_priority/);
  assert.match(partners, /fallback/);
});

test("measured outreach remains available for future automatic delivery", async () => {
  const garageLink = await source("../../app/api/admin/quotes/[id]/garage-link/route.ts");
  assert.match(garageLink, /quote_workshop_outreach/);
  assert.match(garageLink, /workshop_id/);
});
