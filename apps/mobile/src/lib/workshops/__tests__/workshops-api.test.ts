import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWorkshopDetailUrlFromBase,
  buildWorkshopListUrlFromBase,
} from "../urls";

test("workshop list URL trims and encodes Arabic search", () => {
  assert.equal(
    buildWorkshopListUrlFromBase("https://degself.com", { query: "  بنشر متنقل  ", limit: 20 }),
    "https://degself.com/api/mobile/workshops?q=%D8%A8%D9%86%D8%B4%D8%B1+%D9%85%D8%AA%D9%86%D9%82%D9%84&limit=20"
  );
});

test("workshop detail keeps case-sensitive place id intact", () => {
  assert.equal(
    buildWorkshopDetailUrlFromBase("https://degself.com", "ChIJ_AbC"),
    "https://degself.com/api/mobile/workshops?place_id=ChIJ_AbC"
  );
});
