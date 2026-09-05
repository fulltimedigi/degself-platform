import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWorkshopDetailUrlFromBase,
  buildWorkshopListUrlFromBase,
  chunkWorkshopIdsForGet,
} from "../urls";

test("workshop list URL trims and encodes Arabic search", () => {
  assert.equal(
    buildWorkshopListUrlFromBase("https://degself.com", {
      query: "  بنشر متنقل  ",
      limit: 20,
    }),
    "https://degself.com/api/mobile/workshops?q=%D8%A8%D9%86%D8%B4%D8%B1+%D9%85%D8%AA%D9%86%D9%82%D9%84&limit=20"
  );
});

test("emergency filters map to service_mode and specialty params", () => {
  // بنشر متنقل = mobile mode filtered to the tire specialty.
  assert.equal(
    buildWorkshopListUrlFromBase("https://degself.com", {
      serviceMode: "mobile",
      specialty: "تواير وبنشر",
      limit: 30,
    }),
    "https://degself.com/api/mobile/workshops?service_mode=mobile&specialty=%D8%AA%D9%88%D8%A7%D9%8A%D8%B1+%D9%88%D8%A8%D9%86%D8%B4%D8%B1&limit=30"
  );
});

test("emergency filters are ignored on an ids lookup", () => {
  assert.equal(
    buildWorkshopListUrlFromBase("https://degself.com", {
      ids: ["ChIJ_AbC"],
      serviceMode: "tow",
    }),
    "https://degself.com/api/mobile/workshops?ids=ChIJ_AbC"
  );
});

test("workshop detail keeps case-sensitive place id intact", () => {
  assert.equal(
    buildWorkshopDetailUrlFromBase("https://degself.com", "ChIJ_AbC"),
    "https://degself.com/api/mobile/workshops?place_id=ChIJ_AbC"
  );
});

test("saved ids are encoded without changing case", () => {
  assert.equal(
    buildWorkshopListUrlFromBase("https://degself.com/", {
      ids: ["ChIJ_AbC", "x,y"],
    }),
    "https://degself.com/api/mobile/workshops?ids=ChIJ_AbC%2Cx%2Cy"
  );
});

test("saved-id chunking obeys both count and encoded URL bounds", () => {
  const ids = Array.from({ length: 9 }, (_, i) => `CaseSensitive_${i}`);
  const chunks = chunkWorkshopIdsForGet("https://degself.com", ids, 140, 3);

  assert.deepEqual(chunks.flat(), ids);
  assert.ok(chunks.every((chunk) => chunk.length <= 3));
  assert.ok(
    chunks.every(
      (chunk) =>
        buildWorkshopListUrlFromBase("https://degself.com", { ids: chunk })
          .length <= 140
    )
  );
});
