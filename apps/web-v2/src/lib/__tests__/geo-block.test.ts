import assert from "node:assert/strict";
import test from "node:test";
import {
  isSearchEngineBot,
  parseBlockedCountries,
  shouldBlockRequest,
} from "../geo-block";

const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const GOOGLEBOT =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

test("parseBlockedCountries: unset → default [CN]; empty → kill switch", () => {
  assert.deepEqual(parseBlockedCountries(undefined), ["CN"]);
  assert.deepEqual(parseBlockedCountries(null), ["CN"]);
  assert.deepEqual(parseBlockedCountries(""), []);
  assert.deepEqual(parseBlockedCountries("  "), []);
});

test("parseBlockedCountries: parses + normalizes + drops invalid tokens", () => {
  assert.deepEqual(parseBlockedCountries("cn, ru ,Hk"), ["CN", "RU", "HK"]);
  assert.deepEqual(parseBlockedCountries("CN,,,US"), ["CN", "US"]);
  assert.deepEqual(parseBlockedCountries("china,x,123"), []); // none are 2-letter codes
});

test("isSearchEngineBot", () => {
  for (const ua of [GOOGLEBOT, "bingbot/2.0", "Baiduspider", "facebookexternalhit/1.1"]) {
    assert.equal(isSearchEngineBot(ua), true);
  }
  for (const ua of [CHROME, "", null, undefined, "python-requests/2.31"]) {
    assert.equal(isSearchEngineBot(ua), false);
  }
});

test("shouldBlockRequest: blocks a CN human-UA request", () => {
  assert.equal(shouldBlockRequest("CN", CHROME, ["CN"]), true);
  assert.equal(shouldBlockRequest("cn", CHROME, ["CN"]), true); // case-insensitive
});

test("shouldBlockRequest: never blocks a search-engine crawler, even from CN", () => {
  assert.equal(shouldBlockRequest("CN", GOOGLEBOT, ["CN"]), false);
  assert.equal(shouldBlockRequest("CN", "Baiduspider/2.0", ["CN"]), false);
});

test("shouldBlockRequest: does not block allowed countries or missing geo", () => {
  assert.equal(shouldBlockRequest("KW", CHROME, ["CN"]), false);
  assert.equal(shouldBlockRequest(null, CHROME, ["CN"]), false); // no geo header (local/CI)
  assert.equal(shouldBlockRequest(undefined, CHROME, ["CN"]), false);
});

test("shouldBlockRequest: empty block list disables blocking", () => {
  assert.equal(shouldBlockRequest("CN", CHROME, []), false);
});
