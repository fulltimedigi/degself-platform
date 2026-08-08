// Pure, DOM-free, Supabase-free helpers for favorites storage + the
// guest → authenticated handoff. Kept side-effect-free so the loss-safe merge
// logic can be unit-tested without a browser or a database.
//
// ⚠️ place_id is CASE-SENSITIVE and opaque (Google Place ID). Every helper here
// preserves the exact string — never lowercase, uppercase, trim-normalize, or
// slugify an id.

/** De-duplicate while preserving first-seen order and the exact id string. */
export function dedupePreserveCase(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id !== "string" || id.length === 0) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Parse a raw localStorage value into a clean, de-duplicated place_id list.
 * Any malformed payload (non-JSON, non-array, wrong element types) degrades to
 * an empty list rather than throwing.
 */
export function parseFavorites(raw: string | null | undefined): string[] {
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  return dedupePreserveCase(value as string[]);
}

/**
 * UNION merge (server ∪ guest): server order first, then any guest ids not
 * already present. Never drops a server favorite just because it is absent
 * locally — signing in must not lose server state.
 */
export function unionFavorites(
  server: readonly string[],
  guest: readonly string[]
): string[] {
  return dedupePreserveCase([...server, ...guest]);
}

/**
 * The exact rows to insert during handoff: guest ids not already on the server.
 * Idempotent — replaying with the same server state yields an empty list, and
 * the composite PK makes an exact replay a no-op even if it does run.
 */
export function handoffInserts(
  guestSnapshot: readonly string[],
  serverExisting: readonly string[]
): string[] {
  const server = new Set(serverExisting);
  return dedupePreserveCase(guestSnapshot).filter((id) => !server.has(id));
}

/**
 * Loss-safe clear. After a snapshot is successfully transferred, remove ONLY
 * the values that were in that snapshot. Any id that appeared in the guest
 * store WHILE the transfer was in flight is not in the snapshot and must
 * survive — clearing the whole store would drop it.
 */
export function remainingAfterClear(
  currentGuest: readonly string[],
  transferredSnapshot: readonly string[]
): string[] {
  const transferred = new Set(transferredSnapshot);
  return currentGuest.filter((id) => !transferred.has(id));
}
