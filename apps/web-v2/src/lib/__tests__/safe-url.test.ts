import { test } from "node:test";
import assert from "node:assert/strict";
import { isSafeHttpUrl, sanitizePhotoUrls } from "../safe-url";

test("isSafeHttpUrl accepts http(s) only", () => {
  assert.equal(isSafeHttpUrl("https://example.com/a.jpg"), true);
  assert.equal(isSafeHttpUrl("http://cdn.example.com/x"), true);
  assert.equal(isSafeHttpUrl("javascript:alert(1)"), false);
  assert.equal(isSafeHttpUrl("data:text/html,<h1>x</h1>"), false);
  assert.equal(isSafeHttpUrl("//evil.example/x"), false);
  assert.equal(isSafeHttpUrl("vbscript:msgbox"), false);
});

test("sanitizePhotoUrls drops unsafe and caps length", () => {
  const out = sanitizePhotoUrls(
    [
      "https://ok.com/1.jpg",
      "javascript:alert(1)",
      "https://ok.com/2.jpg",
      "https://ok.com/3.jpg",
      "https://ok.com/4.jpg",
    ],
    3
  );
  assert.deepEqual(out, [
    "https://ok.com/1.jpg",
    "https://ok.com/2.jpg",
    "https://ok.com/3.jpg",
  ]);
});
