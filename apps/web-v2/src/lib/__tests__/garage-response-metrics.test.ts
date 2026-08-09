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

test("new garage links require a canonical matched workshop and never create a shared quote link", async () => {
  const route = await source("../../app/api/admin/quotes/[id]/garage-link/route.ts");
  const adminControls = await source("../../components/QuoteAdminControls.tsx");
  assert.match(route, /if \(!workshopId\)/);
  assert.match(route, /matchedPlaceIds\(quote\.matched_workshops\)\.has\(workshopId\)/);
  assert.match(route, /from\("workshops"\)/);
  assert.match(route, /from\("quote_workshop_outreach"\)/);
  assert.match(route, /randomBytes\(32\)/);
  assert.doesNotMatch(route, /select\([^\n]*garage_token/);
  assert.doesNotMatch(route, /update\(\{[^}]*garage_token/);
  assert.doesNotMatch(adminControls, /copyGarageLink/);
  assert.doesNotMatch(adminControls, /رابط الكراجات 🔗/);
});

test("garage capabilities expire server-side and do not count expired opens", async () => {
  const expiryMigration = await source("../../../supabase/migrations/035_garage_rfq_capability_expiry.sql");
  const resolver = await source("../garage-outreach.ts");
  const route = await source("../../app/api/admin/quotes/[id]/garage-link/route.ts");
  assert.match(expiryMigration, /expires_at timestamptz/);
  assert.match(expiryMigration, /48 hours/);
  assert.match(resolver, /select\("id,quote_id,workshop_id,expires_at"\)/);
  assert.match(resolver, /isExpired\(outreach\.expires_at\)/);
  assert.match(resolver, /gt\("expires_at", now\)/);
  assert.match(route, /CAPABILITY_TTL_MS = 48/);
  assert.match(route, /expires_at: expiresAt/);
});

test("measured offer identity is bound to the canonical workshop on the server", async () => {
  const submit = await source("../../app/api/submit-offer/[token]/route.ts");
  const quotes = await source("../quotes.ts");
  assert.match(submit, /if \(resolution\.workshopId\)/);
  assert.match(submit, /\.eq\("place_id", resolution\.workshopId\)/);
  assert.match(submit, /workshop_name: workshop\.name/);
  assert.match(submit, /workshop_phone: workshop\.phone_intl \|\| workshop\.phone/);
  assert.match(quotes, /workshop_name: string \| null/);
});

test("garage token page is PII-safe and prevents capability referrer leakage", async () => {
  const page = await source("../../app/[locale]/submit-offer/[token]/page.tsx");
  const form = await source("../../components/GarageOfferForm.tsx");
  assert.match(page, /referrer: "no-referrer"/);
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true \}/);
  assert.doesNotMatch(page, /customer_name/);
  assert.doesNotMatch(page, /customer_phone/);
  assert.doesNotMatch(form, /track\("garage_offer_submit",\s*\{[\s\S]*?\btoken\s*:/);
  assert.doesNotMatch(form, /track\("garage_offer_submit",\s*\{[\s\S]*?workshop_/);
});

test("garage opens use a same-origin client-render beacon and remain non-blocking", async () => {
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
