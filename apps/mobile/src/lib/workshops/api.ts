import { API_BASE_URL } from "@/config/env";
import type { Workshop, WorkshopListResponse } from "./types";
import {
  buildWorkshopDetailUrlFromBase,
  buildWorkshopListUrlFromBase,
  chunkWorkshopIdsForGet,
  reorderSavedNewestFirst,
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

function isAbort(error: unknown, signal?: AbortSignal): boolean {
  return (
    (signal?.aborted ?? false) ||
    (error instanceof Error && error.name === "AbortError")
  );
}

/**
 * Hydrate an arbitrary number of saved ids without one oversized GET URL or the
 * server's per-request id bound. Chunks are fetched sequentially to avoid bursts,
 * then reconstructed in global newest-first favorite order.
 *
 * Failure isolation: one failed chunk (transient 5xx/timeout) no longer discards
 * every other chunk. Successful chunks are kept; the call only rejects if EVERY
 * chunk failed (so the UI can show a full error + retry). Cancellation still
 * aborts the whole operation immediately.
 */
export async function fetchSavedWorkshops(
  ids: readonly string[],
  signal?: AbortSignal
): Promise<WorkshopListResponse> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return { workshops: [], total: 0 };

  const base = requireApiBaseUrl();
  const chunks = chunkWorkshopIdsForGet(base, unique);
  const found: Workshop[] = [];
  let failures = 0;

  for (const chunk of chunks) {
    const url = buildWorkshopListUrlFromBase(base, { ids: chunk });
    try {
      const parsed = parseWorkshopList(await readJson(url, signal));
      found.push(...parsed.workshops);
    } catch (error) {
      // Cancellation must abort everything; a transient chunk error must not.
      if (isAbort(error, signal)) throw error;
      failures += 1;
    }
  }

  if (found.length === 0 && failures > 0) {
    throw new Error("WORKSHOPS_UNAVAILABLE");
  }

  const workshops = reorderSavedNewestFirst(unique, found);
  return { workshops, total: workshops.length };
}

/**
 * The subset of the given ids that the canonical public read path confirms
 * exist AND are eligible (active, not permanently closed, in scope). Used before
 * the guest→account favorites insert so a stale / hard-deleted id can never
 * trigger a foreign-key violation that would abort the whole transfer.
 * Order and case are preserved.
 */
export async function fetchExistingPlaceIds(
  ids: readonly string[],
  signal?: AbortSignal
): Promise<string[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];

  const base = requireApiBaseUrl();
  const chunks = chunkWorkshopIdsForGet(base, unique);
  const present = new Set<string>();

  // Sequential (no burst); any failure propagates so the caller keeps the guest
  // snapshot and retries — it must never treat "couldn't check" as "ineligible".
  for (const chunk of chunks) {
    const url = buildWorkshopListUrlFromBase(base, { ids: chunk });
    const parsed = parseWorkshopList(await readJson(url, signal));
    for (const workshop of parsed.workshops) present.add(workshop.place_id);
  }

  return unique.filter((id) => present.has(id));
}

export async function fetchWorkshop(
  placeId: string,
  signal?: AbortSignal
): Promise<Workshop> {
  return parseWorkshopDetail(
    await readJson(buildWorkshopDetailUrl(placeId), signal)
  );
}
