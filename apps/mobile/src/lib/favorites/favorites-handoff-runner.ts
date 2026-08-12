// Pure, RN-free orchestrator for the durable guest→authenticated favorites
// handoff. All side effects are injected, so the crash/restart/account-switch
// invariants (H1 FK-safety, H2 account isolation) are exercised by unit tests
// against in-memory fakes — no React, no AsyncStorage, no Supabase.
//
// Ordering that makes the transfer crash-safe:
//   1. read the durable claim + guest snapshot; exclude any snapshot owned by a
//      DIFFERENT identity (H2 — a second account can never inherit it);
//   2. load this user's server favorites;
//   3. durably WRITE the claim BEFORE any server write, binding the snapshot to
//      this user for the whole transfer (crash after here still protects others);
//   4. insert only the eligible subset the public read path confirms exists
//      (H1 — a hard-deleted id is dropped, never FK-aborts the batch);
//   5. clear exactly the snapshot from guest storage (loss-safe: newer additions
//      survive);
//   6. release the claim LAST.
// Any transient failure returns { done:false } with the claim intact, so a retry
// (or the next app launch, for the same user) resumes idempotently.

import {
  remainingAfterClear,
  unionFavorites,
} from "./favorites-sync";
import {
  absorbableGuestIds,
  handoffCandidate,
  ownClaimIds,
  partitionHandoffCandidate,
  type HandoffClaims,
} from "./favorites-handoff";

export type HandoffIO = {
  readClaims: () => Promise<HandoffClaims>;
  /** Upsert THIS user's claim, preserving any other user's claim. */
  writeClaim: (uid: string, ids: string[]) => Promise<boolean>;
  /** Remove only THIS user's claim. */
  clearClaim: (uid: string) => Promise<boolean>;
  readGuest: () => Promise<string[]>;
  writeGuest: (ids: string[]) => Promise<boolean>;
  selectServer: (uid: string) => Promise<string[]>;
  /** Subset of the given ids the canonical read path confirms exist/are eligible. */
  fetchEligible: (ids: string[]) => Promise<string[]>;
  insertServer: (uid: string, ids: string[]) => Promise<void>;
};

export type HandoffResult = {
  /** True only when the snapshot is fully accounted for and the claim released. */
  done: boolean;
  /** Best-known server favorites to display, or null if they couldn't be read. */
  serverIds: string[] | null;
};

export async function performGuestHandoff(
  uid: string,
  io: HandoffIO
): Promise<HandoffResult> {
  const claims = await io.readClaims();
  const guest = await io.readGuest();
  const snapshot = absorbableGuestIds(guest, claims, uid);

  let serverIds: string[];
  try {
    serverIds = await io.selectServer(uid);
  } catch {
    return { done: false, serverIds: null }; // transient: keep guest + claims
  }

  if (snapshot.length === 0) {
    // Nothing of ours to absorb. Drop only our OWN stale claim; other users'
    // claims stay locked for their rightful owners.
    if (ownClaimIds(claims, uid).length > 0) await io.clearClaim(uid);
    return { done: true, serverIds };
  }

  // Durably bind the snapshot to this user BEFORE any server write (preserving
  // any other user's existing claim).
  if (!(await io.writeClaim(uid, snapshot))) {
    return { done: false, serverIds };
  }

  const candidate = handoffCandidate(snapshot, serverIds);
  let toInsert: string[] = [];
  if (candidate.length > 0) {
    let eligible: string[];
    try {
      eligible = await io.fetchEligible(candidate);
    } catch {
      return { done: false, serverIds }; // couldn't verify → retry, never drop blindly
    }
    toInsert = partitionHandoffCandidate(candidate, eligible).toInsert;
  }

  if (toInsert.length > 0) {
    try {
      await io.insertServer(uid, toInsert);
      serverIds = unionFavorites(serverIds, toInsert);
    } catch {
      return { done: false, serverIds }; // transient insert failure → claim persists
    }
  }

  const current = await io.readGuest();
  if (!(await io.writeGuest(remainingAfterClear(current, snapshot)))) {
    return { done: false, serverIds }; // clear failed → claim persists, retry cleanup
  }

  await io.clearClaim(uid); // release this user's durable claim last
  return { done: true, serverIds };
}
