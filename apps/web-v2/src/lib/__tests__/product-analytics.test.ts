import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PRODUCT_EVENT_PROPERTIES,
  captureProductEvent,
  sanitizeProductProperties,
} from "../product-analytics";

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

test("unknown events are never sent to PostHog", () => {
  assert.equal(sanitizeProductProperties("not_registered", { source: "x" }), null);
});

test("search keeps derived metrics but drops raw query and unexpected fields", () => {
  assert.deepEqual(
    sanitizeProductProperties("search", {
      query: "my phone is 55555555",
      has_query: true,
      query_length: 20,
      result_count: 8,
      filter_count: 2,
      source: "directory",
      locale: "ar",
      phone: "55555555",
      unexpected: "drop-me",
    }),
    {
      has_query: true,
      query_length: 20,
      result_count: 8,
      filter_count: 2,
      source: "directory",
      locale: "ar",
    }
  );
});

test("contact events never retain phone, workshop name, message, or tokens", () => {
  assert.deepEqual(
    sanitizeProductProperties("whatsapp", {
      place_id: "public-place-id",
      source: "workshop_page",
      locale: "en",
      channel: "whatsapp",
      phone: "50000000",
      workshop_name: "Private name",
      message: "hello",
      token: "secret-token",
    }),
    {
      place_id: "public-place-id",
      source: "workshop_page",
      locale: "en",
      channel: "whatsapp",
    }
  );
});

test("only finite numbers, booleans, and short strings survive", () => {
  assert.deepEqual(
    sanitizeProductProperties("offers_view", {
      offer_count: Number.NaN,
      status: "open",
      quote_source: "q".repeat(121),
      locale: "ur",
    }),
    { status: "open", locale: "ur" }
  );
});

test("all declared PostHog properties are scalar allow-list keys", () => {
  for (const [event, properties] of Object.entries(PRODUCT_EVENT_PROPERTIES)) {
    assert.ok(event.length > 0);
    assert.equal(new Set(properties).size, properties.length, `${event} has duplicate keys`);
    for (const property of properties) {
      assert.match(property, /^[a-z][a-z0-9_]*$/);
    }
  }
});

test("capture is a safe no-op outside the browser or without env", () => {
  assert.doesNotThrow(() => captureProductEvent("search", { has_query: true }));
});

test("capture uses sanitized first-party bridge and generic analytics never receives raw search text", () => {
  const analytics = readFileSync(join(process.cwd(), "src/lib/product-analytics.ts"), "utf8");
  const bridge = readFileSync(join(process.cwd(), "src/app/api/ds-b1/route.ts"), "utf8");
  const searchTracker = readFileSync(join(process.cwd(), "src/components/SearchTracker.tsx"), "utf8");
  const track = readFileSync(join(process.cwd(), "src/lib/track.ts"), "utf8");
  const clientCode = stripComments(analytics);
  const bridgeCode = stripComments(bridge);

  assert.match(bridgeCode, /\$process_person_profile:\s*false/);
  assert.match(clientCode, /POSTHOG_CAPTURE_PATH\s*=\s*["']\/api\/ds-b1["']/);
  assert.match(clientCode, /fetch\(POSTHOG_CAPTURE_PATH/);
  assert.match(clientCode, /credentials:\s*["']same-origin["']/);
  assert.doesNotMatch(clientCode, /api_key\s*:/);
  assert.doesNotMatch(clientCode, /posthog\.identify|session_recording\s*:|autocapture\s*:/i);
  assert.doesNotMatch(
    searchTracker,
    /track\(\s*"search"\s*,\s*\{[\s\S]*?\bquery\s*:/
  );
  assert.match(searchTracker, /snapSearchString:\s*q/);
  assert.doesNotMatch(track, /props\?\.query/);
});

test("quote and offer success events are emitted only after successful responses", () => {
  const quote = readFileSync(join(process.cwd(), "src/components/NewQuoteForm.tsx"), "utf8");
  const offers = readFileSync(join(process.cwd(), "src/components/OffersChooser.tsx"), "utf8");
  const garage = readFileSync(join(process.cwd(), "src/components/GarageOfferForm.tsx"), "utf8");

  assert.ok(quote.indexOf('if (!res.ok)') < quote.indexOf('track("quote_submit"'));
  assert.ok(offers.indexOf('if (!res.ok)') < offers.indexOf('track("offer_accept"'));
  assert.ok(garage.indexOf('if (!r.ok)') < garage.indexOf('track("garage_offer_submit"'));
});
