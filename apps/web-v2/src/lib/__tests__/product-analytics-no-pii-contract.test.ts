import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUCT_EVENT_PROPERTIES } from "../product-analytics";

const forbiddenExact = new Set([
  "phone",
  "mobile",
  "email",
  "customer_name",
  "workshop_name",
  "problem",
  "problem_description",
  "description",
  "notes",
  "message",
  "image",
  "image_url",
  "token",
  "secret",
  "query",
  "search_term",
  "address",
  "location_text",
  "quote_id",
  "offer_id",
]);

test("PostHog allowlists never expose raw PII/content identifiers", () => {
  for (const [event, keys] of Object.entries(PRODUCT_EVENT_PROPERTIES)) {
    for (const key of keys) {
      assert.equal(
        forbiddenExact.has(key),
        false,
        `${event} must not allow sensitive property ${key}`
      );
    }
  }
});
