import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWorkshopLink } from "../partner-workshop-link";

test("extracts place_id from locale-prefixed DEGSELF workshop links", () => {
  assert.deepEqual(
    parseWorkshopLink("https://degself.com/ar/workshop/ChIJAbC123?utm_source=admin#x"),
    { ok: true, placeId: "ChIJAbC123" }
  );
  assert.deepEqual(parseWorkshopLink("https://www.degself.com/en/workshop/AbC_xyz"), {
    ok: true,
    placeId: "AbC_xyz",
  });
});

test("accepts unprefixed/relative workshop paths and preserves case", () => {
  assert.deepEqual(parseWorkshopLink("/workshop/CaseSensitiveID"), {
    ok: true,
    placeId: "CaseSensitiveID",
  });
});

test("rejects non-DEGSELF hosts and non-workshop URLs", () => {
  assert.deepEqual(parseWorkshopLink("https://example.com/ar/workshop/ChIJ123"), {
    ok: false,
    error: "invalid_url",
  });
  assert.deepEqual(parseWorkshopLink("https://degself.com/ar/search?q=garage"), {
    ok: false,
    error: "not_workshop_url",
  });
});
