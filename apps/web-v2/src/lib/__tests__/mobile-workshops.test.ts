import assert from "node:assert/strict";
import test from "node:test";
import {
  MOBILE_WORKSHOP_OFFSET_MAX,
  parseMobileWorkshopRequest,
  toMobileWorkshop,
} from "../mobile-workshops";
import type { Workshop } from "../types";

test("mobile workshop query is bounded and trimmed", () => {
  const parsed = parseMobileWorkshopRequest(
    new URL("https://degself.com/api/mobile/workshops?q=%20%D8%A8%D9%86%D8%B4%D8%B1%20&limit=999&offset=-4")
  );
  assert.deepEqual(parsed, { kind: "search", query: "بنشر", limit: 30, offset: 0 });
});

test("mobile workshop offset supports deep pagination but stays bounded", () => {
  const within = parseMobileWorkshopRequest(
    new URL("https://degself.com/api/mobile/workshops?offset=1850")
  );
  assert.equal(within.kind, "search");
  if (within.kind === "search") assert.equal(within.offset, 1850);

  const capped = parseMobileWorkshopRequest(
    new URL("https://degself.com/api/mobile/workshops?offset=999999")
  );
  assert.equal(capped.kind, "search");
  if (capped.kind === "search") {
    assert.equal(capped.offset, MOBILE_WORKSHOP_OFFSET_MAX);
  }
});

test("emergency filters: known service_mode and specialty pass through", () => {
  const parsed = parseMobileWorkshopRequest(
    new URL(
      "https://degself.com/api/mobile/workshops?service_mode=mobile&specialty=%D8%AA%D9%88%D8%A7%D9%8A%D8%B1%20%D9%88%D8%A8%D9%86%D8%B4%D8%B1"
    )
  );
  assert.equal(parsed.kind, "search");
  if (parsed.kind === "search") {
    assert.equal(parsed.serviceMode, "mobile");
    assert.equal(parsed.specialty, "تواير وبنشر");
  }
});

test("emergency filters: unknown service_mode is dropped, not forwarded", () => {
  const parsed = parseMobileWorkshopRequest(
    new URL("https://degself.com/api/mobile/workshops?service_mode=bogus")
  );
  assert.equal(parsed.kind, "search");
  if (parsed.kind === "search") {
    assert.equal(parsed.serviceMode, undefined);
    assert.equal(parsed.specialty, undefined);
  }
});

test("saved workshop ids are deduped without changing case", () => {
  const parsed = parseMobileWorkshopRequest(
    new URL("https://degself.com/api/mobile/workshops?ids=AbC,xyz,AbC")
  );
  assert.deepEqual(parsed, { kind: "saved", ids: ["AbC", "xyz"] });
});

test("mobile DTO excludes internal ranking and audit fields", () => {
  const workshop = {
    place_id: "AbC",
    name: "Test",
    reviewed_specialty: "ميكانيك",
    entity_type: "workshop",
    service_mode: "fixed",
    area: "Kuwait",
    neighborhood: null,
    governorate: null,
    address: null,
    lat: null,
    lng: null,
    phone: null,
    phone_intl: null,
    google_rating: 4.5,
    google_reviews_count: 10,
    opening_hours: null,
    emergency_service: false,
    is_partner: false,
    search_text: "must not leak",
    partner_notes: "must not leak",
    main_image: "javascript:alert(1)",
    website: "https://example.com",
  } as Workshop;

  const dto = toMobileWorkshop(workshop);
  assert.equal(dto.place_id, "AbC");
  assert.equal("search_text" in dto, false);
  assert.equal("partner_notes" in dto, false);
  assert.equal(dto.main_image, null);
  assert.equal(dto.website, "https://example.com/");
});
