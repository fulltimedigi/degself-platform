import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyUrl,
  isAuthStartUrl,
  nativeAuthReturnToWebUrl,
  NATIVE_AUTH_REDIRECT_URL,
} from "../navigation";

const HOST = "degself.com";
const WEB = "https://degself.com";

test("our own site (absolute, www, and relative) stays in the WebView", () => {
  assert.equal(classifyUrl("https://degself.com/emergency", HOST), "webview");
  assert.equal(classifyUrl("https://www.degself.com/search?q=بنشر", HOST), "webview");
  assert.equal(classifyUrl("/workshop/abc", HOST), "webview");
  assert.equal(classifyUrl("#section", HOST), "webview");
  assert.equal(classifyUrl("about:blank", HOST), "webview");
});

test("subdomains of our site stay in the WebView", () => {
  assert.equal(classifyUrl("https://api.degself.com/x", HOST), "webview");
});

test("dialer / WhatsApp / maps schemes go to the OS", () => {
  assert.equal(classifyUrl("tel:+96555551234", HOST), "native");
  assert.equal(classifyUrl("mailto:hi@degself.com", HOST), "native");
  assert.equal(classifyUrl("whatsapp://send?phone=96555551234", HOST), "native");
  assert.equal(classifyUrl("geo:29.37,47.97", HOST), "native");
});

test("WhatsApp / maps web hosts open in their native apps", () => {
  assert.equal(classifyUrl("https://wa.me/96555551234", HOST), "native");
  assert.equal(classifyUrl("https://maps.app.goo.gl/abc", HOST), "native");
  assert.equal(classifyUrl("https://maps.google.com/?q=x", HOST), "native");
});

test("OAuth providers open in the system browser (embedded WebViews are blocked)", () => {
  assert.equal(classifyUrl("https://accounts.google.com/o/oauth2/v2/auth?x=1", HOST), "system-browser");
  assert.equal(classifyUrl("https://appleid.apple.com/auth/authorize", HOST), "system-browser");
  assert.equal(classifyUrl("https://xqmwhrimxnvqlpvfzcac.supabase.co/auth/v1/authorize", HOST), "system-browser");
});

test("any other website opens in the system browser, not our shell", () => {
  assert.equal(classifyUrl("https://instagram.com/degself", HOST), "system-browser");
  assert.equal(classifyUrl("https://example.com", HOST), "system-browser");
});

test("blank input is treated as an in-app navigation", () => {
  assert.equal(classifyUrl("", HOST), "webview");
});

test("OAuth start URLs are detected (Supabase authorize + provider hosts)", () => {
  assert.equal(
    isAuthStartUrl("https://xqmwhrimxnvqlpvfzcac.supabase.co/auth/v1/authorize?provider=google&redirect_to=degself%3A%2F%2Fauth%2Fcallback"),
    true
  );
  assert.equal(isAuthStartUrl("https://accounts.google.com/o/oauth2/v2/auth?x=1"), true);
  assert.equal(isAuthStartUrl("https://appleid.apple.com/auth/authorize?x=1"), true);
});

test("non-auth URLs are not treated as OAuth starts", () => {
  assert.equal(isAuthStartUrl("https://degself.com/account"), false);
  // A supabase URL that is not the authorize endpoint (e.g. storage/rest) stays out.
  assert.equal(isAuthStartUrl("https://xqmwhrimxnvqlpvfzcac.supabase.co/rest/v1/x"), false);
  assert.equal(isAuthStartUrl(""), false);
  assert.equal(isAuthStartUrl("not a url"), false);
});

test("native auth return URL maps to the WebView https callback (preserving query)", () => {
  assert.equal(
    nativeAuthReturnToWebUrl(`${NATIVE_AUTH_REDIRECT_URL}?next=%2Faccount&code=abc123`, WEB),
    "https://degself.com/auth/callback?next=%2Faccount&code=abc123"
  );
  // Trailing slash on the web origin is normalized.
  assert.equal(
    nativeAuthReturnToWebUrl(`${NATIVE_AUTH_REDIRECT_URL}?code=x`, "https://degself.com/"),
    "https://degself.com/auth/callback?code=x"
  );
});

test("a URL that is not our auth return is rejected", () => {
  assert.equal(nativeAuthReturnToWebUrl("https://evil.com/auth/callback?code=x", WEB), null);
  assert.equal(nativeAuthReturnToWebUrl("degself://other?code=x", WEB), null);
});
