import assert from "node:assert/strict";
import test from "node:test";
import {
  assertOAuthBrowserSuccess,
  GoogleSignInCancelled,
  resolvePkceCode,
} from "../oauth-code";

test("PKCE callback accepts an authorization code", () => {
  assert.equal(resolvePkceCode({ params: { code: "auth-code-123" } }), "auth-code-123");
});

test("implicit-flow tokens in the URL are rejected (no fallback)", () => {
  // access_token / refresh_token present but NO code → hard failure.
  assert.throws(
    () =>
      resolvePkceCode({
        params: {
          access_token: "ey.at",
          refresh_token: "ey.rt",
          token_type: "bearer",
        },
      }),
    /google-missing-pkce-code/
  );
});

test("empty or missing code is rejected", () => {
  assert.throws(() => resolvePkceCode({ params: {} }), /google-missing-pkce-code/);
  assert.throws(() => resolvePkceCode({ params: { code: "" } }), /google-missing-pkce-code/);
  assert.throws(
    () => resolvePkceCode({ params: { code: null } }),
    /google-missing-pkce-code/
  );
});

test("a provider-reported error is surfaced verbatim", () => {
  assert.throws(
    () => resolvePkceCode({ params: {}, errorCode: "access_denied" }),
    /access_denied/
  );
});

test("browser cancel/dismiss maps to GoogleSignInCancelled", () => {
  assert.throws(() => assertOAuthBrowserSuccess("cancel"), GoogleSignInCancelled);
  assert.throws(() => assertOAuthBrowserSuccess("dismiss"), GoogleSignInCancelled);
  assert.doesNotThrow(() => assertOAuthBrowserSuccess("success"));
});
