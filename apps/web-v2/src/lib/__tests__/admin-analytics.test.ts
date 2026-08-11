import assert from "node:assert/strict";
import test from "node:test";
import { buildConversionAnalytics } from "../admin-analytics";

test("conversion analytics separates routed, offered and accepted stages", () => {
  const analytics = buildConversionAnalytics(
    [
      { id: "q1", created_at: "2026-08-10T08:00:00Z", status: "new", source: "quote_bar", service: "تواير" },
      { id: "q2", created_at: "2026-08-10T09:00:00Z", status: "offers_sent", source: "asaali", service: "ميكانيكا" },
      { id: "q3", created_at: "2026-08-11T09:00:00Z", status: "accepted", source: "asaali", service: "ميكانيكا" },
    ],
    [
      { id: "o1", quote_id: "q2", status: "pending", created_at: "2026-08-10T10:00:00Z", accepted_at: null },
      { id: "o2", quote_id: "q3", status: "accepted", created_at: "2026-08-11T10:00:00Z", accepted_at: "2026-08-11T11:00:00Z" },
      { id: "old", quote_id: "outside", status: "accepted", created_at: "2026-08-11T10:00:00Z", accepted_at: "2026-08-11T11:00:00Z" },
    ],
    7,
    new Date("2026-08-11T12:00:00Z")
  );

  assert.deepEqual(analytics.stages.map((stage) => stage.count), [3, 2, 2, 1]);
  assert.equal(analytics.stages[2].fromStart, 66.7);
  assert.equal(analytics.stages[3].fromPrevious, 50);
  assert.equal(analytics.totalOffers, 2);
  assert.equal(analytics.medianFirstOfferHours, 1);
  assert.deepEqual(analytics.sources.map(({ name, count }) => [name, count]), [
    ["asaali", 2],
    ["quote_bar", 1],
  ]);
  assert.equal(analytics.daily.at(-1)?.accepted, 1);
});

test("empty conversion analytics never emits invalid percentages", () => {
  const analytics = buildConversionAnalytics([], [], 30, new Date("2026-08-11T12:00:00Z"));
  assert.equal(analytics.stages.every((stage) => stage.fromStart === 0), true);
  assert.equal(analytics.medianFirstOfferHours, null);
  assert.equal(analytics.daily.length, 30);
});
