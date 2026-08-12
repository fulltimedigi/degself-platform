import type { Workshop } from "./types";

const ENDPOINT = "/api/mobile/workshops";

export function buildWorkshopListUrlFromBase(
  apiBaseUrl: string,
  params: { query?: string; ids?: readonly string[]; limit?: number; offset?: number }
): string {
  if (!apiBaseUrl) throw new Error("Missing API base URL.");
  const search = new URLSearchParams();
  if (params.ids) search.set("ids", params.ids.join(","));
  else {
    if (params.query?.trim()) search.set("q", params.query.trim());
    if (params.limit != null) search.set("limit", String(params.limit));
    if (params.offset != null) search.set("offset", String(params.offset));
  }
  return `${apiBaseUrl.replace(/\/+$/, "")}${ENDPOINT}?${search.toString()}`;
}

export function buildWorkshopDetailUrlFromBase(apiBaseUrl: string, placeId: string): string {
  if (!apiBaseUrl) throw new Error("Missing API base URL.");
  const search = new URLSearchParams({ place_id: placeId });
  return `${apiBaseUrl.replace(/\/+$/, "")}${ENDPOINT}?${search.toString()}`;
}

/**
 * Existence-only lookup URL for the favorites handoff. Returns `{ place_ids }`
 * for the ids that EXIST in the catalog (regardless of public visibility) — the
 * exact FK-safety check for user_favorites.place_id, so an existing-but-hidden
 * favorite is never mistaken for a hard-deleted one.
 */
export function buildWorkshopExistsUrlFromBase(
  apiBaseUrl: string,
  ids: readonly string[]
): string {
  if (!apiBaseUrl) throw new Error("Missing API base URL.");
  const search = new URLSearchParams({ mode: "exists", ids: ids.join(",") });
  return `${apiBaseUrl.replace(/\/+$/, "")}${ENDPOINT}?${search.toString()}`;
}

/**
 * Split saved ids so every GET remains below both the public route's hard id
 * bound and a conservative encoded-URL length. The original case/order is kept.
 */
export function chunkWorkshopIdsForGet(
  apiBaseUrl: string,
  ids: readonly string[],
  maxUrlLength = 1_800,
  maxIdsPerRequest = 80
): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];

  for (const id of ids) {
    const candidate = [...current, id];
    const exceedsCount = candidate.length > maxIdsPerRequest;
    const exceedsUrl =
      buildWorkshopListUrlFromBase(apiBaseUrl, { ids: candidate }).length >
      maxUrlLength;

    if (current.length > 0 && (exceedsCount || exceedsUrl)) {
      chunks.push(current);
      current = [id];
    } else {
      current = candidate;
    }
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

/**
 * Reconstruct saved workshops in global newest-first favorite order from an
 * unordered set of fetched rows. Pure and case-preserving: dedupes by place_id,
 * keeps only ids that were actually returned (non-public / removed ones are
 * silently dropped), and reverses the oldest-first favorite order to newest-first.
 */
export function reorderSavedNewestFirst(
  orderedIds: readonly string[],
  found: readonly Workshop[]
): Workshop[] {
  const byId = new Map(found.map((w) => [w.place_id, w] as const));
  const seen = new Set<string>();
  const out: Workshop[] = [];
  for (const id of [...new Set(orderedIds)].reverse()) {
    const workshop = byId.get(id);
    if (workshop && !seen.has(id)) {
      seen.add(id);
      out.push(workshop);
    }
  }
  return out;
}
