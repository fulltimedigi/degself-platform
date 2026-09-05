import assert from "node:assert/strict";
import test from "node:test";
import { callUrl, safeWebsiteUrl, whatsappUrl } from "../links";
import type { Workshop } from "../types";

const base = { phone: "+965 5555 1234", phone_intl: null } as Workshop;

test("contact links contain digits only", () => {
  assert.equal(callUrl(base), "tel:+96555551234");
  assert.equal(whatsappUrl(base), "https://wa.me/96555551234");
});

test("local Kuwait numbers gain the country code", () => {
  const local = { ...base, phone: "5555 1234" } as Workshop;
  assert.equal(callUrl(local), "tel:+96555551234");
  assert.equal(whatsappUrl(local), "https://wa.me/96555551234");
});

test("website links reject unsafe protocols", () => {
  assert.equal(safeWebsiteUrl("javascript:alert(1)"), null);
  assert.equal(safeWebsiteUrl("https://example.com"), "https://example.com/");
});
