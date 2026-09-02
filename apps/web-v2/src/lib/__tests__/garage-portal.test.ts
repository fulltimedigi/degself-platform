import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isValidPortalToken,
  normalizeKuwaitMobile,
  validateGarageEdit,
  portalExportToCsv,
  portalUrlForToken,
  buildOutreachMessage,
  outreachWaLink,
  type PortalExportRow,
} from "../garage-portal";

test("isValidPortalToken accepts 40-hex tokens only", () => {
  assert.equal(isValidPortalToken("a".repeat(40)), true);
  assert.equal(isValidPortalToken("f8d77ea1d4eb849f0be30f7f34da1b8d4cb01149"), true);
  assert.equal(isValidPortalToken("A".repeat(40)), false); // uppercase not produced by encode(hex)
  assert.equal(isValidPortalToken("a".repeat(39)), false);
  assert.equal(isValidPortalToken("a".repeat(41)), false);
  assert.equal(isValidPortalToken("../secret"), false);
  assert.equal(isValidPortalToken(null), false);
  assert.equal(isValidPortalToken(undefined), false);
});

test("normalizeKuwaitMobile handles common formats", () => {
  assert.deepEqual(normalizeKuwaitMobile("55123456"), { local: "55123456", intl: "+96555123456" });
  assert.deepEqual(normalizeKuwaitMobile("+965 5512 3456"), { local: "55123456", intl: "+96555123456" });
  assert.deepEqual(normalizeKuwaitMobile("0096560123456"), { local: "60123456", intl: "+96560123456" });
  assert.deepEqual(normalizeKuwaitMobile("965 91234567"), { local: "91234567", intl: "+96591234567" });
});

test("normalizeKuwaitMobile rejects non-mobiles", () => {
  assert.equal(normalizeKuwaitMobile("22123456"), null); // landline (starts 2)
  assert.equal(normalizeKuwaitMobile("1234567"), null); // too short
  assert.equal(normalizeKuwaitMobile("551234567"), null); // 9 digits
  assert.equal(normalizeKuwaitMobile("abc"), null);
});

test("validateGarageEdit builds a partial patch of only provided fields", () => {
  const { patch, errors } = validateGarageEdit({
    whatsapp: "55123456",
    area: "حولي",
    specialty: "  ميكانيكا   ومكينة ",
    specialtyHints: ["تكييف", " فرامل ", "تكييف"],
    openingHours: "السبت–الخميس ٩ص–٩م",
    description: "خدمة سريعة",
  });
  assert.deepEqual(errors, []);
  assert.equal(patch.phone, "55123456");
  assert.equal(patch.phone_intl, "+96555123456");
  assert.equal(patch.area, "حولي");
  assert.equal(patch.reviewed_specialty, "ميكانيكا ومكينة"); // whitespace collapsed
  assert.deepEqual(patch.specialty_hints, ["تكييف", "فرامل"]); // trimmed + de-duped
  assert.equal(patch.opening_hours, "السبت–الخميس ٩ص–٩م");
  assert.equal(patch.self_description, "خدمة سريعة");
});

test("validateGarageEdit skips empty fields and does not wipe hints", () => {
  const { patch, errors } = validateGarageEdit({
    whatsapp: "",
    area: "",
    specialty: "   ",
    specialtyHints: [],
    openingHours: null,
    description: undefined,
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(patch, {}); // nothing to change
});

test("validateGarageEdit reports invalid phone and unknown area", () => {
  const { patch, errors } = validateGarageEdit({ whatsapp: "22123456", area: "مكان غير موجود" });
  assert.equal(errors.length, 2);
  assert.equal(patch.phone, undefined);
  assert.equal(patch.area, undefined);
});

test("portalUrlForToken builds the vanity URL", () => {
  assert.equal(
    portalUrlForToken("f8d77ea1d4eb849f0be30f7f34da1b8d4cb01149"),
    "https://degself.com/كراجي/f8d77ea1d4eb849f0be30f7f34da1b8d4cb01149"
  );
});

test("buildOutreachMessage includes garage name, link, and identity", () => {
  const msg = buildOutreachMessage("كراج النور", "https://degself.com/كراجي/abc123");
  assert.ok(msg.includes("كراج النور"));
  assert.ok(msg.includes("https://degself.com/كراجي/abc123"));
  assert.ok(msg.includes("دق سلف")); // explains who we are
  assert.ok(msg.includes("مجانية")); // states it's free
});

test("outreachWaLink builds a wa.me link with digits-only number and encoded text", () => {
  const link = outreachWaLink("كراج النور", "+96555123456", "https://degself.com/كراجي/abc123");
  assert.ok(link.startsWith("https://wa.me/96555123456?text="));
  assert.ok(!link.includes("+965")); // number is digits only
  const text = decodeURIComponent(link.split("?text=")[1]);
  assert.ok(text.includes("كراج النور"));
  assert.ok(text.includes("https://degself.com/كراجي/abc123"));
});

test("portalExportToCsv escapes and BOM-prefixes", () => {
  const rows: PortalExportRow[] = [
    {
      name: 'كراج "النجم"',
      area: "حولي",
      whatsapp: "+96555123456",
      portalUrl: "https://degself.com/كراجي/abc",
      isPartner: false,
    },
  ];
  const csv = portalExportToCsv(rows);
  assert.ok(csv.startsWith("﻿"), "has UTF-8 BOM");
  assert.ok(csv.includes('"كراج ""النجم"""'), "escapes embedded quotes");
  assert.ok(csv.includes(",no\r\n"), "renders is_partner + CRLF");
  assert.ok(csv.split("\r\n")[0] === "﻿name,area,whatsapp,portal_url,is_partner");
});
