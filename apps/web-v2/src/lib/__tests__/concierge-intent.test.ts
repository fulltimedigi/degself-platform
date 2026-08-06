import { test } from "node:test";
import assert from "node:assert/strict";
import { detectConciergeIntent } from "../concierge-intent";

test("detects quote intent", () => {
  assert.equal(detectConciergeIntent("أبغى عرض سعر"), "quote");
  assert.equal(detectConciergeIntent("كم يكلف تصليح القير"), "quote");
});

test("detects diagnose intent", () => {
  assert.equal(detectConciergeIntent("السيارة تطلع دخان أبيض"), "diagnose");
  assert.equal(detectConciergeIntent("فيه صوت غريب بالمكينة"), "diagnose");
});

test("detects emergency and find", () => {
  assert.equal(detectConciergeIntent("محتاج سطحة الحين"), "emergency");
  assert.equal(detectConciergeIntent("أدور كراج بالشويخ"), "find_garage");
});

test("greeting", () => {
  assert.equal(detectConciergeIntent("هلا"), "greeting");
  assert.equal(detectConciergeIntent("hello"), "greeting");
});
