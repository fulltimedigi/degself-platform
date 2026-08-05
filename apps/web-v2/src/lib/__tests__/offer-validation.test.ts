import { test } from "node:test";
import assert from "node:assert/strict";
import { validateOffer } from "../offer-validation";

function validFixed(overrides: Record<string, unknown> = {}) {
  return {
    workshop_name: "كراج النور",
    pricing_type: "fixed",
    price_kwd: "25",
    parts_type: "original",
    validity_days: "3",
    warranty_days: "30",
    ...overrides,
  };
}

test("accepts a valid fixed offer", () => {
  const result = validateOffer(validFixed());
  assert.ok(result.value);
  assert.equal(result.value?.workshop_name, "كراج النور");
  assert.equal(result.value?.price_kwd, 25);
  assert.equal(result.value?.pricing_type, "fixed");
});

test("rejects missing workshop name", () => {
  const result = validateOffer(validFixed({ workshop_name: "  " }));
  assert.ok(result.errors?.workshop_name);
});

test("rejects warranty below minimum", () => {
  const result = validateOffer(validFixed({ warranty_days: "3" }));
  assert.ok(result.errors?.warranty_days);
});

test("parses Arabic digits in price", () => {
  const result = validateOffer(validFixed({ price_kwd: "٢٥" }));
  assert.ok(result.value);
  assert.equal(result.value?.price_kwd, 25);
});

test("range requires max >= min", () => {
  const result = validateOffer(
    validFixed({
      pricing_type: "range",
      price_kwd: "40",
      price_max_kwd: "20",
    })
  );
  assert.ok(result.errors?.price_max_kwd);
});
