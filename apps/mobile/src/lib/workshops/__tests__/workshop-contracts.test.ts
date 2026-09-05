import assert from "node:assert/strict";
import test from "node:test";
import { isWorkshop, parseWorkshopDetail, parseWorkshopList } from "../contracts";
import type { Workshop } from "../types";

const workshop: Workshop = {
  place_id: "ChIJ_AbC",
  name: "Test Workshop",
  reviewed_specialty: "ميكانيك",
  entity_type: "workshop",
  service_mode: "fixed",
  area: "الشويخ",
  neighborhood: null,
  governorate: "العاصمة",
  address: null,
  lat: 29.3,
  lng: 47.9,
  phone: null,
  phone_intl: "+96555551234",
  website: null,
  google_rating: 4.5,
  google_reviews_count: 20,
  opening_hours: null,
  main_image: null,
  emergency_service: false,
  is_partner: true,
};

test("validates the complete public workshop contract", () => {
  assert.equal(isWorkshop(workshop), true);
  assert.deepEqual(parseWorkshopList({ workshops: [workshop], total: 1 }), {
    workshops: [workshop],
    total: 1,
  });
  assert.deepEqual(parseWorkshopDetail({ workshop }), workshop);
});

test("rejects malformed server data before it reaches native UI", () => {
  assert.equal(isWorkshop({ place_id: "x", name: "Incomplete" }), false);
  // A malformed ROW is dropped (resilient) rather than discarding the whole page…
  assert.deepEqual(parseWorkshopList({ workshops: [{ place_id: "x" }] }), {
    workshops: [],
  });
  // …but a non-array `workshops` field and a bad detail payload are still rejected.
  assert.throws(() => parseWorkshopList({ workshops: "nope" }));
  assert.throws(() => parseWorkshopList(null));
  assert.throws(() => parseWorkshopDetail({ workshop: null }));
});
