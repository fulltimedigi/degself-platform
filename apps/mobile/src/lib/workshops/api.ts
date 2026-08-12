import { API_BASE_URL } from "@/config/env";
import type { Workshop, WorkshopListResponse } from "./types";
import {
  buildWorkshopDetailUrlFromBase,
  buildWorkshopListUrlFromBase,
  chunkWorkshopIdsForGet,
} from "./urls";
import { parseWorkshopDetail, parseWorkshopList } from "./contracts";

function requireApiBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL.");
  }
  return API_BASE_URL;
}

export function buildWorkshopListUrl(params: {
  query?: string;
  ids?: readonly string[];
  limit?: number;
  offset?: number;
}): string {
  return buildWorkshopListUrlFromBase(requireApiBaseUrl(), params);
}

export function buildWorkshopDetailUrl(placeId: string): string {
  return buildWorkshopDetailUrlFromBase(requireApiBaseUrl(), placeId);
}

async function readJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const timeoutController = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    timeoutController.abort();
  }, 12_000);
  const abort = () => timeoutController.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: timeoutController.signal,
    });
    if (!response.ok) {
      throw new Error(
        response.status === 404 ? "NOT_FOUND" : "WORKSHOPS_UNAVAILABLE"
      );
    }
    return await response.json();
  } catch (error) {
    if (timedOut) throw new Error("WORKSHOPS_UNAVAILABLE");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export async function fetchWorkshops(
  params: {
    query?: string;
    ids?: readonly string[];
    limit?: number;
    offset?: number;
  },
  signal?: AbortSignal
): Promise<WorkshopListResponse> {
  return parseWorkshopList(await readJson(buildWorkshopListUrl(params), signal));
}

/**
 * Hydrate an arbitrary number of saved ids without one oversized GET URL or the
 * server's per-request id bound. Chunks are fetched sequentially to avoid bursts,
 * then reconstructed in global newest-first favorite order.
 */
export async function fetchSavedWorkshops(
  ids: readonly string[],
  signal?: AbortSignal
): Promise<WorkshopListResponse> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return { workshops: [], total: 0 };

  const base = requireApiBaseUrl();
  const chunks = chunkWorkshopIdsForGet(base, unique);
  const byId = new Map<string, Workshop>();

  for (const chunk of chunks) {
    const url = buildWorkshopListUrlFromBase(base, { ids: chunk });
    const parsed = parseWorkshopList(await readJson(url, signal));
    for (const workshop of parsed.workshops) {
      byId.set(workshop.place_id, workshop);
    }
  }

  const workshops = [...unique]
    .reverse()
    .map((id) => byId.get(id))
    .filter((workshop): workshop is Workshop => Boolean(workshop));

  return { workshops, total: workshops.length };
}

export async function fetchWorkshop(
  placeId: string,
  signal?: AbortSignal
): Promise<Workshop> {
  return parseWorkshopDetail(
    await readJson(buildWorkshopDetailUrl(placeId), signal)
  );
}
