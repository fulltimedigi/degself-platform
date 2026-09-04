// Pure, RN-free, Supabase-free core for the DURABLE guest → authenticated
// favorites handoff. Isolating the decisions here keeps the account-isolation
// invariant (H2) and the FK-safety invariant (H1) unit-testable without React
// Native, AsyncStorage, or a live Supabase client.
//
// ── Why a durable claim record ────────────────────────────────────────────────
// The dangerous scenario is a crash / process kill / account switch in the
// window between (a) writing a guest snapshot into user A's server favorites and
// (b) clearing that snapshot from device-global guest storage. If the guest
// store is not cleared, a DIFFERENT user B who signs in next would otherwise
// absorb A's favorites into B's account (cross-account contamination).
//
// The fix: BEFORE any server write, we durably record a "claim" — { userId, ids }
// — in storage. A claim marks that snapshot as belonging to exactly one
// authenticated identity. While a claim owned by A exists, its ids are excluded
// from any OTHER user's absorbable set, so B can never absorb them even if the
// app died at the worst possible moment. The claim is deleted only after the
// snapshot is fully accounted for (on-server ∪ inserted ∪ permanently-dropped)
// AND cleared from guest storage. A itself resumes the claim idempotently.
//
// ⚠️ place_id is CASE-SENSITIVE and opaque — every helper preserves the exact id.

import { dedupePreserveCase, handoffInserts } from "./favorites-sync";

/**
 * Durable record of every in-flight snapshot absorption, keyed by the owning
 * Supabase user id. A MAP (not a single slot) is essential: if user A's transfer
 * is interrupted and user B then signs in with their OWN guest favorites to
 * absorb, B must be able to record its claim WITHOUT overwriting/erasing A's —
 * otherwise A's lock would vanish and a later user could inherit A's snapshot.
 * Each entry is released independently by its owner.
 */
export type HandoffClaims = Record<string, string[]>;

/** The ids the current user has previously claimed (for interrupted-transfer resume). */
export function ownClaimIds(claims: HandoffClaims, uid: string): string[] {
  return claims[uid] ?? [];
}

/** Union of every id claimed by a DIFFERENT identity — permanently locked out. */
export function foreignClaimedIds(
  claims: HandoffClaims,
  uid: string
): Set<string> {
  const locked = new Set<string>();
  for (const [owner, ids] of Object.entries(claims)) {
    if (owner === uid) continue;
    for (const id of ids) locked.add(id);
  }
  return locked;
}

/**
 * The guest ids the CURRENT user may absorb.
 * - Any snapshot claimed by a DIFFERENT identity is locked out entirely (H2): a
 *   second user can never inherit the first user's favorites, even if guest
 *   storage was never cleared after a crash.
 * - The current user's OWN claim ids are folded back in so an interrupted
 *   transfer resumes for the rightful owner.
 */
export function absorbableGuestIds(
  guest: readonly string[],
  claims: HandoffClaims,
  uid: string
): string[] {
  const locked = foreignClaimedIds(claims, uid);
  const merged = dedupePreserveCase([...guest, ...ownClaimIds(claims, uid)]);
  return merged.filter((id) => !locked.has(id));
}

/** Parse the durable claim map, degrading any malformed value to an empty map. */
export function parseHandoffClaims(raw: string | null | undefined): HandoffClaims {
  if (!raw) return {};
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: HandoffClaims = {};
  for (const [owner, ids] of Object.entries(value as Record<string, unknown>)) {
    if (typeof owner !== "string" || owner.length === 0) continue;
    if (!Array.isArray(ids)) continue;
    const clean = dedupePreserveCase(ids as string[]);
    if (clean.length > 0) out[owner] = clean;
  }
  return out;
}

/** Serialize the claim map to its canonical durable form (deduped, exact case). */
export function serializeHandoffClaims(claims: HandoffClaims): string {
  const out: HandoffClaims = {};
  for (const [owner, ids] of Object.entries(claims)) {
    const clean = dedupePreserveCase(ids);
    if (clean.length > 0) out[owner] = clean;
  }
  return JSON.stringify(out);
}

/** Upsert one owner's claim into the map (empty ids removes the entry). */
export function withClaim(
  claims: HandoffClaims,
  uid: string,
  ids: readonly string[]
): HandoffClaims {
  const next: HandoffClaims = { ...claims };
  const clean = dedupePreserveCase(ids);
  if (clean.length > 0) next[uid] = clean;
  else delete next[uid];
  return next;
}

/** Remove one owner's claim from the map. */
export function withoutClaim(claims: HandoffClaims, uid: string): HandoffClaims {
  const next: HandoffClaims = { ...claims };
  delete next[uid];
  return next;
}

/**
 * Split the guest ids not yet on the server into the subset that is safe to
 * insert (confirmed to exist via the canonical public read path) and the subset
 * that must be permanently dropped (hard-deleted / no longer eligible). Dropping
 * the latter — instead of letting a single stale id abort the whole atomic
 * insert with a foreign-key violation — is what prevents both data loss for the
 * valid ids (H1) and an every-launch retry storm.
 */
export function partitionHandoffCandidate(
  candidate: readonly string[],
  eligible: readonly string[]
): { toInsert: string[]; dropped: string[] } {
  const eligibleSet = new Set(eligible);
  const toInsert: string[] = [];
  const dropped: string[] = [];
  for (const id of dedupePreserveCase(candidate)) {
    if (eligibleSet.has(id)) toInsert.push(id);
    else dropped.push(id);
  }
  return { toInsert, dropped };
}

/**
 * Candidate guest ids that are not already on the server, for a given snapshot.
 * Thin wrapper over the shared handoffInserts to keep the plan in one place.
 */
export function handoffCandidate(
  snapshot: readonly string[],
  serverIds: readonly string[]
): string[] {
  return handoffInserts(snapshot, serverIds);
}

/**
 * Whether an optimistic guest toggle must roll back after its persistence write
 * failed. Rolls back only when the write failed AND no newer toggle has
 * superseded it (equal versions) — so a late failed write never clobbers a
 * newer user action.
 */
export function shouldRollbackGuestWrite(
  persisted: boolean,
  versionAtWrite: number,
  currentVersion: number
): boolean {
  return !persisted && versionAtWrite === currentVersion;
}
