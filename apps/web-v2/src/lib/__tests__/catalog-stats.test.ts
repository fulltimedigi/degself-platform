import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PUBLIC_WORKSHOP_COUNT_LABEL,
  normalizeCatalogCountClaims,
} from "../catalog-stats";

test("normalizes legacy current catalog claims without changing historical audit counts", () => {
  const input = {
    exact: "ابحث في 1,757 كراج موثّق",
    oldRounded: "1,640+ workshops",
    broad: "more than 1,800 garages",
    historical: "راجعنا 1,798 كراجاً وحذفنا 45 منها",
    nested: ["بيانات من 1,640+ كراج", { value: "1,757" }],
  };

  const normalized = normalizeCatalogCountClaims(input);

  assert.equal(normalized.exact, `ابحث في ${PUBLIC_WORKSHOP_COUNT_LABEL} كراج موثّق`);
  assert.equal(normalized.oldRounded, `${PUBLIC_WORKSHOP_COUNT_LABEL} workshops`);
  assert.equal(normalized.broad, "more than 1,850 garages");
  assert.equal(normalized.historical, input.historical);
  assert.deepEqual(normalized.nested, [
    `بيانات من ${PUBLIC_WORKSHOP_COUNT_LABEL} كراج`,
    { value: PUBLIC_WORKSHOP_COUNT_LABEL },
  ]);
});

test("does not mutate imported message dictionaries", () => {
  const input = { description: "1,757 garages" };
  const normalized = normalizeCatalogCountClaims(input);

  assert.notEqual(normalized, input);
  assert.equal(input.description, "1,757 garages");
  assert.equal(normalized.description, `${PUBLIC_WORKSHOP_COUNT_LABEL} garages`);
});
