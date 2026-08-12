import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWorkshopExistsUrlFromBase,
  buildWorkshopListUrlFromBase,
  chunkWorkshopIdsForGet,
  reorderSavedNewestFirst,
} from "../urls";
import { parseExistingPlaceIds, parseWorkshopList } from "../contracts";
import type { Workshop } from "../types";

const BASE = "https://degself.com";
const MAX_URL = 1_800;
const MAX_IDS = 80;

function ids(n: number, prefix = "ChIJ"): string[] {
  return Array.from({ length: n }, (_, i) => `${prefix}_${String(i).padStart(4, "0")}`);
}

function assertChunksSound(input: string[]): string[][] {
  const chunks = chunkWorkshopIdsForGet(BASE, input);
  for (const chunk of chunks) {
    assert.ok(chunk.length <= MAX_IDS, `chunk over id cap: ${chunk.length}`);
    const url = buildWorkshopListUrlFromBase(BASE, { ids: chunk });
    // A lone id longer than the URL budget is unavoidably emitted alone; only
    // enforce the URL bound for multi-id chunks.
    if (chunk.length > 1) {
      assert.ok(url.length <= MAX_URL, `chunk url too long: ${url.length}`);
    }
  }
  // Order + completeness preserved, no duplicates introduced.
  assert.deepEqual(chunks.flat(), input);
  return chunks;
}

test("chunking boundaries: 0, 1, 99, 100, 101, 250+", () => {
  assert.deepEqual(chunkWorkshopIdsForGet(BASE, ids(0)), []);
  assert.deepEqual(chunkWorkshopIdsForGet(BASE, ids(1)), [ids(1)]);

  for (const n of [99, 100, 101, 250, 512]) {
    const chunks = assertChunksSound(ids(n));
    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    assert.equal(total, n);
    // With ~13-char ids the count cap binds first at 80.
    assert.equal(chunks[0].length, Math.min(MAX_IDS, n));
  }
});

test("chunking respects the encoded-URL bound with unusually long place ids", () => {
  const longIds = ids(40, "X".repeat(200)); // each id ~206 chars
  const chunks = assertChunksSound(longIds);
  // The URL bound must force chunks far smaller than the 80-id count cap.
  assert.ok(chunks.length > 1, "long ids should split into several chunks");
  for (const chunk of chunks) {
    assert.ok(chunk.length < MAX_IDS);
  }
});

test("reorderSavedNewestFirst: global newest-first order, dedupe, drop missing", () => {
  const found = [w("a"), w("b"), w("c")]; // returned unordered / partial
  // Favorites are stored oldest-first; display is newest-first (reverse).
  assert.deepEqual(
    reorderSavedNewestFirst(["a", "b", "c"], found).map((x) => x.place_id),
    ["c", "b", "a"]
  );
  // Duplicate input ids collapse; an id with no returned row is silently dropped.
  assert.deepEqual(
    reorderSavedNewestFirst(["a", "b", "a", "gone"], found).map((x) => x.place_id),
    ["b", "a"]
  );
  // Chunk order is irrelevant: global order derives from the id list, not the rows.
  assert.deepEqual(
    reorderSavedNewestFirst(["a", "b", "c"], [w("c"), w("a"), w("b")]).map((x) => x.place_id),
    ["c", "b", "a"]
  );
});

test("parseWorkshopList drops malformed rows instead of discarding the whole page", () => {
  const good = rawWorkshop("a");
  const parsed = parseWorkshopList({
    workshops: [good, { place_id: "b" /* missing required fields */ }, rawWorkshop("c")],
    total: 3,
  });
  assert.deepEqual(parsed.workshops.map((x) => x.place_id), ["a", "c"]);
  assert.equal(parsed.total, 3);
});

test("parseWorkshopList still rejects a non-array workshops field", () => {
  assert.throws(() => parseWorkshopList({ workshops: "nope" }), /INVALID_WORKSHOP_RESPONSE/);
  assert.throws(() => parseWorkshopList(null), /INVALID_WORKSHOP_RESPONSE/);
});

test("exists-URL builder + parse: FK existence check (visibility-independent)", () => {
  const url = buildWorkshopExistsUrlFromBase(BASE, ["ChIJ_a", "ChIJ_b"]);
  assert.ok(url.startsWith(`${BASE}/api/mobile/workshops?`));
  assert.ok(url.includes("mode=exists"));
  assert.ok(url.includes("ids=ChIJ_a%2CChIJ_b"));

  assert.deepEqual(
    parseExistingPlaceIds({ place_ids: ["ChIJ_a", "ChIJ_b"] }),
    ["ChIJ_a", "ChIJ_b"]
  );
  // malformed entries filtered; wrong shape rejected
  assert.deepEqual(parseExistingPlaceIds({ place_ids: ["ok", 5, "", null] }), ["ok"]);
  assert.throws(() => parseExistingPlaceIds({ place_ids: "nope" }), /INVALID_WORKSHOP_RESPONSE/);
  assert.throws(() => parseExistingPlaceIds(null), /INVALID_WORKSHOP_RESPONSE/);
});

// ── helpers ──────────────────────────────────────────────────────────────────
function w(place_id: string): Workshop {
  return { place_id } as unknown as Workshop;
}

function rawWorkshop(place_id: string): Record<string, unknown> {
  return {
    place_id,
    name: `Workshop ${place_id}`,
    reviewed_specialty: null,
    entity_type: "workshop",
    service_mode: "in_shop",
    area: null,
    neighborhood: null,
    governorate: null,
    address: null,
    lat: null,
    lng: null,
    phone: null,
    phone_intl: null,
    website: null,
    google_rating: null,
    google_reviews_count: null,
    opening_hours: null,
    main_image: null,
    emergency_service: false,
    is_partner: false,
  };
}
