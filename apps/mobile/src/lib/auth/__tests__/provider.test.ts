import assert from "node:assert/strict";
import test from "node:test";
import { providerOf } from "../provider";

test("providerOf reads app_metadata.provider first", () => {
  assert.equal(providerOf({ app_metadata: { provider: "google" } }), "google");
  assert.equal(providerOf({ app_metadata: { provider: "apple" } }), "apple");
});

test("providerOf falls back to a linked identity", () => {
  assert.equal(
    providerOf({ app_metadata: {}, identities: [{ provider: "apple" }] }),
    "apple"
  );
  assert.equal(
    providerOf({ identities: [{ provider: "google" }] }),
    "google"
  );
});

test("providerOf returns null for unknown / missing providers (drives unknown-provider failure)", () => {
  assert.equal(providerOf(null), null);
  assert.equal(providerOf(undefined), null);
  assert.equal(providerOf({ app_metadata: { provider: "email" } }), null);
  assert.equal(providerOf({ app_metadata: {}, identities: [] }), null);
  assert.equal(providerOf({ identities: [{ provider: "facebook" }] }), null);
});
