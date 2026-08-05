import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isOfferExpired,
  isValidQuoteStatus,
  statusMeta,
  urgencyClass,
  DEFAULT_VALIDITY_DAYS,
} from "../quote-status";

test("isValidQuoteStatus accepts lifecycle values only", () => {
  assert.equal(isValidQuoteStatus("new"), true);
  assert.equal(isValidQuoteStatus("accepted"), true);
  assert.equal(isValidQuoteStatus("nope"), false);
  assert.equal(isValidQuoteStatus(1), false);
});

test("statusMeta falls back to new", () => {
  assert.equal(statusMeta("offers_sent").label, "أُرسلت العروض للعميل");
  assert.equal(statusMeta("unknown").label, STATUS_NEW_LABEL());
  assert.equal(statusMeta(null).label, STATUS_NEW_LABEL());
});

function STATUS_NEW_LABEL() {
  return "جديد";
}

test("urgencyClass falls back for unknown values", () => {
  assert.match(urgencyClass("طارئ"), /red/);
  assert.match(urgencyClass("something-else"), /neutral/);
});

test("isOfferExpired respects validity_days", () => {
  const created = "2026-08-01T00:00:00.000Z";
  const day = 24 * 60 * 60 * 1000;
  const t0 = Date.parse(created);
  assert.equal(isOfferExpired(created, 3, t0 + 2 * day), false);
  assert.equal(isOfferExpired(created, 3, t0 + 4 * day), true);
  assert.equal(isOfferExpired(created, null, t0 + (DEFAULT_VALIDITY_DAYS + 1) * day), true);
});
