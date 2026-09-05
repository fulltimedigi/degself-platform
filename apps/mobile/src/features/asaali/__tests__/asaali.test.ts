import assert from "node:assert/strict";
import test from "node:test";

import { whatsAppUrl } from "../wa";
import { asaaliCopy } from "../copy";

test("whatsAppUrl strips non-digits (including +) and omits query when no message", () => {
  assert.equal(whatsAppUrl("+965 9000 1234"), "https://wa.me/96590001234");
});

test("whatsAppUrl encodes the pre-filled Arabic message", () => {
  const url = whatsAppUrl("96590001234", "مرحبا");
  assert.equal(url, "https://wa.me/96590001234?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7");
});

test("asaaliCopy returns Arabic for ar and known-shape English for en", () => {
  assert.equal(asaaliCopy("ar").title, "اسأل دق سلف");
  assert.equal(asaaliCopy("en").title, "Ask DEGSELF");
});

test("asaaliCopy falls back to English for hi/ur and to Arabic for unknown", () => {
  assert.equal(asaaliCopy("hi").title, "Ask DEGSELF");
  assert.equal(asaaliCopy("ur").title, "Ask DEGSELF");
  assert.equal(asaaliCopy("zz").title, "اسأل دق سلف");
});

test("asaaliCopy exposes the same set of example prompts per locale", () => {
  assert.equal(asaaliCopy("ar").emptyExamples.length, 4);
  assert.equal(asaaliCopy("en").emptyExamples.length, 4);
});
