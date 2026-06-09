import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeArabic } from "../normalize";

test("Kuwaiti garage variants unify to كراج", () => {
  assert.equal(normalizeArabic("جراج"), "كراج");
  assert.equal(normalizeArabic("قراج"), "كراج");
  assert.equal(normalizeArabic("كراج"), "كراج");
});

test("strips tashkeel and tatweel", () => {
  assert.equal(normalizeArabic("الَرّي الشّويخ"), "الري الشويخ");
  assert.equal(normalizeArabic("مُحَمَّد"), "محمد");
  assert.equal(normalizeArabic("كــراج"), "كراج"); // tatweel
});

test("unifies alif / ya / ta-marbuta variants", () => {
  assert.equal(normalizeArabic("أوتو"), "اوتو");
  assert.equal(normalizeArabic("سيارة"), "سياره");
  assert.equal(normalizeArabic("مصطفى"), "مصطفي");
});

test("lowercases ASCII, preserves Arabic", () => {
  assert.equal(normalizeArabic("AlBabtain البابطين"), "albabtain البابطين");
});

test("collapses whitespace and trims", () => {
  assert.equal(normalizeArabic("  الري   الشويخ  "), "الري الشويخ");
});

test("empty / falsy input returns empty string", () => {
  assert.equal(normalizeArabic(""), "");
});
