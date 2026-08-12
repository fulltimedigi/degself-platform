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
