import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRatingListInteractive,
  isValidRating,
  parseRatingListReply,
  ratingRowId,
} from "../settlement-review";

test("ratingRowId / parseRatingListReply round-trip 1..5", () => {
  for (let n = 1; n <= 5; n++) {
    assert.equal(ratingRowId(n), `settlement_rate_${n}`);
    assert.equal(parseRatingListReply(ratingRowId(n)), n);
  }
});

test("parseRatingListReply rejects out-of-range and foreign ids", () => {
  assert.equal(parseRatingListReply("settlement_rate_0"), null);
  assert.equal(parseRatingListReply("settlement_rate_6"), null);
  assert.equal(parseRatingListReply("settlement_rate_x"), null);
  assert.equal(parseRatingListReply("settlement_confirm_yes"), null);
  assert.equal(parseRatingListReply(""), null);
  assert.equal(parseRatingListReply(null), null);
  assert.equal(parseRatingListReply(undefined), null);
});

test("isValidRating", () => {
  for (const n of [1, 2, 3, 4, 5]) assert.equal(isValidRating(n), true);
  for (const bad of [0, 6, 2.5, -1, NaN, "3", null, undefined]) {
    assert.equal(isValidRating(bad), false);
  }
});

test("rating list message: 5 rows, valid ids, WhatsApp length limits, neutral copy", () => {
  const msg = buildRatingListInteractive("كراج الشويخ") as {
    type: string;
    body: { text: string };
    action: { button: string; sections: { rows: { id: string; title: string }[] }[] };
  };
  assert.equal(msg.type, "list");
  assert.match(msg.body.text, /كراج الشويخ/);
  assert.ok(msg.action.button.length <= 20, "list button title <= 20");
  const rows = msg.action.sections[0].rows;
  assert.equal(rows.length, 5);
  assert.deepEqual(
    rows.map((r) => parseRatingListReply(r.id)),
    [5, 4, 3, 2, 1]
  );
  for (const r of rows) {
    assert.ok([...r.title].length <= 24, `row title too long: ${r.title}`);
  }
  // Compliance: must NOT solicit a *positive* review or offer any incentive.
  assert.doesNotMatch(msg.body.text, /إيجابي|خصم|هدية|كوبون|٥ نجوم فقط/);
});
