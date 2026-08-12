import { API_BASE_URL } from "@/config/env";
import type { Workshop, WorkshopListResponse } from "./types";
import {
  buildWorkshopDetailUrlFromBase,
  buildWorkshopListUrlFromBase,
} from "./urls";
import { parseWorkshopDetail, parseWorkshopList } from "./contracts";

const SAVED_REQUEST_URL_MAX = 1_800;

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
 * server's per-request 100-id bound. Chunks are sized by the actual encoded URL
 * length, fetched sequentially to avoid request bursts, then reconstructed in
 * global newest-first favorite order.
 */
export async function fetchSavedWorkshops(
  ids: readonly string[],
  signal?: AbortSignal
): Promise<WorkshopListResponse> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return { workshops: [], total: 0 };

  const chunks: string[][] = [];
  let current: string[] = [];
  for (const id of unique) {
    const candidate = [...current, id];
    if (
      current.length > 0 &&
      buildWorkshopListUrl({ ids: candidate }).length > SAVED_REQUEST_URL_MAX
    ) {
      chunks.push(current);
      current = [id];
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) chunks.push(current);

  const byId = new Map<string, Workshop>();
  for (const chunk of chunks) {
    const parsed = parseWorkshopList(
      await readJson(buildWorkshopListUrl({ ids: chunk }), signal)
    );
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
