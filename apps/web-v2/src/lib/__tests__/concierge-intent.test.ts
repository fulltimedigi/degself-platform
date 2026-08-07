import { test } from "node:test";
import assert from "node:assert/strict";
import { detectConciergeIntent } from "../concierge-intent";

test("keeps explicit quote intent deterministic", () => {
  assert.equal(detectConciergeIntent("أبغى عرض سعر"), "quote");
  assert.equal(detectConciergeIntent("كم يكلف تصليح القير"), "quote");
  assert.equal(detectConciergeIntent("I need a price quote"), "quote");
});

test("keeps clear diagnosis symptoms deterministic", () => {
  assert.equal(detectConciergeIntent("السيارة تطلع دخان أبيض"), "diagnose");
  assert.equal(detectConciergeIntent("فيه صوت غريب بالمكينة"), "diagnose");
});

test("keeps explicit emergency and garage search deterministic", () => {
  assert.equal(detectConciergeIntent("محتاج سطحة الحين"), "emergency");
  assert.equal(detectConciergeIntent("أدور كراج بالشويخ"), "find_garage");
  assert.equal(detectConciergeIntent("أقرب كراج"), "find_garage");
});

test("keeps exact greetings deterministic", () => {
  assert.equal(detectConciergeIntent("هلا"), "greeting");
  assert.equal(detectConciergeIntent("hello"), "greeting");
  assert.equal(detectConciergeIntent("السلام عليكم"), "greeting");
});

test("returns unknown for ambiguous text instead of guessing from length", () => {
  assert.equal(detectConciergeIntent("سيارتي وقفت فجأة بالطريق"), "unknown");
  assert.equal(detectConciergeIntent("أحتاج مساعدة بالسيارة"), "unknown");
  assert.equal(detectConciergeIntent("it stopped suddenly on the road"), "unknown");
  assert.equal(detectConciergeIntent("هذا نص طويل لكنه لا يحتوي نية واضحة"), "unknown");
});
