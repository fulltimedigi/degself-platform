import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(relative: string): Promise<string> {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

test("garage response attribution is canonical, server-only, and per workshop", async () => {
  const migration = await source("../../../supabase/migrations/030_quote_workshop_outreach.sql");

  assert.match(migration, /workshop_id\s+text not null references public\.workshops\(place_id\)/);
  assert.match(migration, /unique \(quote_id, workshop_id\)/);
  assert.match(migration, /token\s+text not null unique/);
  assert.match(migration, /first_outreach_at/);
  assert.match(migration, /first_opened_at/);
  assert.match(migration, /responded_at/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.quote_workshop_outreach from anon, authenticated/);
  assert.doesNotMatch(migration, /create policy/);
});

test("garage response timestamp is transactionally tied to a measured offer insert", async () => {
  const migration = await source("../../../supabase/migrations/030_quote_workshop_outreach.sql");
  const submit = await source("../../app/api/submit-offer/[token]/route.ts");

  assert.match(migration, /add column if not exists outreach_id uuid/);
  assert.match(migration, /after insert on public\.quote_offers/);
  assert.match(migration, /responded_at = coalesce\(responded_at, new\.created_at\)/);
  assert.match(submit, /if \(resolution\.outreachId\) insertPayload\.outreach_id = resolution\.outreachId/);
  assert.doesNotMatch(submit, /update\(\{\s*responded_at/);
});

test("measured garage links only target canonical matched workshops and keep legacy fallback", async () => {
  const route = await source("../../app/api/admin/quotes/[id]/garage-link/route.ts");
  const resolver = await source("../garage-outreach.ts");

  assert.match(route, /matchedPlaceIds\(quote\.matched_workshops\)\.has\(workshopId\)/);
  assert.match(route, /from\("workshops"\)/);
  assert.match(route, /from\("quote_workshop_outreach"\)/);
  assert.match(route, /Legacy shared link/);
  assert.match(route, /garage_token/);
  assert.match(resolver, /UNDEFINED_TABLE = "42P01"/);
  assert.match(resolver, /from\("quote_workshop_outreach"\)/);
  assert.match(resolver, /from\("quotes"\)/);
});

test("garage opens use a client-render beacon and remain non-blocking", async () => {
  const form = await source("../../components/GarageOfferForm.tsx");
  const openRoute = await source("../../app/api/garage-outreach/[token]/open/route.ts");

  assert.match(form, /api\/garage-outreach\/\$\{encodeURIComponent\(token\)\}\/open/);
  assert.match(form, /keepalive: true/);
  assert.match(openRoute, /markGarageOutreachOpened/);
  assert.match(openRoute, /status: 204/);
  assert.match(openRoute, /Measurement must never block the garage workflow/);
});

test("admin UI creates one measured link per matched workshop", async () => {
  const component = await source("../../components/MeasuredGarageLinks.tsx");
  const page = await source("../../app/[locale]/admin/quotes/[id]/page.tsx");

  assert.match(component, /workshop_id: workshop\.place_id/);
  assert.match(component, /إنشاء ونسخ الرابط/);
  assert.match(page, /MeasuredGarageLinks/);
  assert.match(page, /value=\{q\.matched_workshops\}/);
});
