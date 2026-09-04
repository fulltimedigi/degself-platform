import assert from "node:assert/strict";
import test from "node:test";
import {
  canRequestNextPage,
  displayCount,
  isStaleResponse,
  mergePage,
  reachedEnd,
  type LoadMoreFlags,
} from "../search-pagination";
import type { Workshop } from "../types";

function w(place_id: string): Workshop {
  return { place_id } as unknown as Workshop;
}

const ok: LoadMoreFlags = {
  initialLoading: false,
  loadingMore: false,
  hasError: false,
  pageError: false,
  queryMatchesActive: true,
  atEnd: false,
};

test("mergePage dedupes across pages and preserves order", () => {
  const page1 = [w("a"), w("b")];
  const page2 = [w("b"), w("c")]; // "b" repeated across pages
  assert.deepEqual(
    mergePage(page1, page2).map((x) => x.place_id),
    ["a", "b", "c"]
  );
});

test("displayCount uses the server total, not the loaded page length", () => {
  assert.equal(displayCount(1802, 24), 1802);
  assert.equal(displayCount(null, 24), 24); // fallback only when total unknown
});

test("isStaleResponse rejects results from a superseded query", () => {
  assert.equal(isStaleResponse(2, 3), true);
  assert.equal(isStaleResponse(3, 3), false);
});

test("reachedEnd: server total is authoritative; missing total falls back to a short page", () => {
  assert.equal(reachedEnd(24, 100, 24, 24), false); // 24/100, full page → more
  assert.equal(reachedEnd(100, 100, 24, 24), true); // count reached total
  // total unknown → a full last page means "keep going", a short one means "done"
  assert.equal(reachedEnd(24, null, 24, 24), false);
  assert.equal(reachedEnd(40, null, 16, 24), true);
});

test("canRequestNextPage suppresses duplicate onEndReached (in-flight)", () => {
  assert.equal(canRequestNextPage(ok), true);
  assert.equal(canRequestNextPage({ ...ok, loadingMore: true }), false);
});

test("canRequestNextPage ignores a stale query and end-of-list", () => {
  assert.equal(canRequestNextPage({ ...ok, queryMatchesActive: false }), false);
  assert.equal(canRequestNextPage({ ...ok, atEnd: true }), false);
});

test("canRequestNextPage holds while initial-loading or errored (needs explicit retry)", () => {
  assert.equal(canRequestNextPage({ ...ok, initialLoading: true }), false);
  assert.equal(canRequestNextPage({ ...ok, hasError: true }), false);
  assert.equal(canRequestNextPage({ ...ok, pageError: true }), false);
});
