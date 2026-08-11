import assert from "node:assert/strict";
import test from "node:test";
import {
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
