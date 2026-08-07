import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const tracker = readFileSync(join(process.cwd(), "src/components/SearchTracker.tsx"), "utf8");
const track = readFileSync(join(process.cwd(), "src/lib/track.ts"), "utf8");

test("raw directory search text is isolated to the existing Snap SEARCH payload", () => {
  assert.match(tracker, /snapSearchString:\s*q/);
  assert.match(tracker, /has_query:\s*Boolean\(q\)/);
  assert.match(tracker, /query_length:\s*q\.length/);
  assert.doesNotMatch(track, /props\?\.query/);
  assert.doesNotMatch(track, /properties\?\.query/);
});
