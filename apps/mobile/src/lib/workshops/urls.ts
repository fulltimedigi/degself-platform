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
