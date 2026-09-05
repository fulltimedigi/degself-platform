import assert from "node:assert/strict";
import test from "node:test";
import { registerPayload, resolveNotificationUrl } from "../push-core";

const WEB = "https://degself.com";
const HOST = "degself.com";

test("registerPayload carries the token and platform", () => {
  assert.deepEqual(registerPayload("ExponentPushToken[abc]", "ios"), {
    token: "ExponentPushToken[abc]",
    platform: "ios",
  });
});

test("resolveNotificationUrl resolves a relative path against our origin", () => {
  assert.equal(
    resolveNotificationUrl({ path: "/my-quotes/123" }, WEB, HOST),
    "https://degself.com/my-quotes/123",
  );
});

test("resolveNotificationUrl accepts an absolute same-origin url (incl. www)", () => {
  assert.equal(
    resolveNotificationUrl({ url: "https://degself.com/emergency" }, WEB, HOST),
    "https://degself.com/emergency",
  );
  // www is a different hostname than the bare host — treated as off-host here on
  // purpose (the shell's classifyUrl handles www separately for link routing);
  // notifications should send bare-host URLs.
  assert.equal(
    resolveNotificationUrl({ url: "https://www.degself.com/x" }, WEB, HOST),
    null,
  );
});

test("resolveNotificationUrl refuses to point the WebView off our host", () => {
  assert.equal(resolveNotificationUrl({ url: "https://evil.example.com/phish" }, WEB, HOST), null);
  assert.equal(resolveNotificationUrl({ url: "javascript:alert(1)" }, WEB, HOST), null);
  assert.equal(resolveNotificationUrl({ url: "data:text/html,<h1>x" }, WEB, HOST), null);
});

test("resolveNotificationUrl handles missing / malformed data safely", () => {
  assert.equal(resolveNotificationUrl(null, WEB, HOST), null);
  assert.equal(resolveNotificationUrl(undefined, WEB, HOST), null);
  assert.equal(resolveNotificationUrl({}, WEB, HOST), null);
  assert.equal(resolveNotificationUrl({ url: "" }, WEB, HOST), null);
  assert.equal(resolveNotificationUrl({ url: 42 }, WEB, HOST), null);
  assert.equal(resolveNotificationUrl("nope", WEB, HOST), null);
});

test("resolveNotificationUrl prefers url over path when both are present", () => {
  assert.equal(
    resolveNotificationUrl({ url: "https://degself.com/a", path: "/b" }, WEB, HOST),
    "https://degself.com/a",
  );
});
