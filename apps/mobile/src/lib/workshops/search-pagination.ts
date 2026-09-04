// Pure, RN-free search-pagination logic. Extracted so the concurrency-sensitive
// rules (duplicate onEndReached suppression, stale-response rejection, stop-at-
// total, dedupe/merge, server-total display) are unit-testable without mounting
// a FlatList or mocking a component.
import type { Workshop } from "./types";

/** Merge a newly loaded page into existing results, deduped by place_id, order-stable. */
export function mergePage(
  current: readonly Workshop[],
  incoming: readonly Workshop[]
): Workshop[] {
  const seen = new Set(current.map((w) => w.place_id));
  const out = [...current];
  for (const w of incoming) {
    if (!seen.has(w.place_id)) {
      seen.add(w.place_id);
      out.push(w);
    }
  }
  return out;
}

/** A response is stale (from a superseded query) when its id no longer matches. */
export function isStaleResponse(
  requestId: number,
  currentRequestId: number
): boolean {
  return requestId !== currentRequestId;
}

/**
 * Whether the list has reached its end. Prefer the authoritative server total;
 * fall back to "the last page was not full" so a missing total cannot cause an
 * infinite onEndReached loop (defence for the optional `total` field).
 */
export function reachedEnd(
  loadedCount: number,
  total: number | null,
  lastPageSize: number,
  pageSize: number
): boolean {
  if (total != null) return loadedCount >= total;
  return lastPageSize < pageSize;
}

export type LoadMoreFlags = {
  initialLoading: boolean;
  loadingMore: boolean;
  hasError: boolean;
  pageError: boolean;
  queryMatchesActive: boolean;
  atEnd: boolean;
};

/**
 * Guard for issuing another page. Suppresses: concurrent duplicate
 * onEndReached (loadingMore), a query that changed under us (stale),
 * an unrecovered page error, and end-of-list.
 */
export function canRequestNextPage(f: LoadMoreFlags): boolean {
  return (
    !f.initialLoading &&
    !f.loadingMore &&
    !f.hasError &&
    !f.pageError &&
    f.queryMatchesActive &&
    !f.atEnd
  );
}

/** The count to display: the server-reported total when known, else the loaded count. */
export function displayCount(total: number | null, loadedCount: number): number {
  return total != null ? total : loadedCount;
}
