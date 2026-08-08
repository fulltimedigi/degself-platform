import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LOCALES,
  DEFAULT_LOCALE,
  localeDirection,
  isRTL,
  isSupportedLocale,
} from "../direction";

test("the four DEGSELF locales map to the correct direction", () => {
  assert.equal(localeDirection("ar"), "rtl");
  assert.equal(localeDirection("ur"), "rtl");
  assert.equal(localeDirection("en"), "ltr");
  assert.equal(localeDirection("hi"), "ltr");
});

test("isRTL agrees with localeDirection", () => {
  assert.equal(isRTL("ar"), true);
  assert.equal(isRTL("ur"), true);
  assert.equal(isRTL("en"), false);
  assert.equal(isRTL("hi"), false);
});

test("exactly four locales are supported and each has a valid direction", () => {
  assert.deepEqual([...LOCALES], ["ar", "en", "hi", "ur"]);
  for (const l of LOCALES) {
    assert.ok(["rtl", "ltr"].includes(localeDirection(l)), `${l} has a direction`);
  }
});

test("default locale is Arabic (RTL)", () => {
  assert.equal(DEFAULT_LOCALE, "ar");
  assert.equal(isRTL(DEFAULT_LOCALE), true);
});

test("isSupportedLocale guards unknown / non-string input", () => {
  assert.equal(isSupportedLocale("ar"), true);
  assert.equal(isSupportedLocale("en"), true);
  assert.equal(isSupportedLocale("fr"), false);
  assert.equal(isSupportedLocale(""), false);
  assert.equal(isSupportedLocale(null), false);
  assert.equal(isSupportedLocale(undefined), false);
  assert.equal(isSupportedLocale(42), false);
});
