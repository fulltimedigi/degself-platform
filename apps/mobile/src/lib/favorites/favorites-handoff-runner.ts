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
  handoffCandidate,
  partitionHandoffCandidate,
} from "./favorites-handoff";

export type HandoffIO = {
  /**
   * Atomically compute AND durably persist this user's absorbable snapshot in a
   * single locked read-modify-write (excludes any other user's claimed ids,
   * folds this user's own prior claim back in). Returns the claimed snapshot, or
   * null if it could not be persisted. This is what makes the claim decision
   * race-free against overlapping handoffs.
   */
  claimSnapshot: (uid: string, guest: string[]) => Promise<string[] | null>;
  /** Remove only THIS user's claim. */
  clearClaim: (uid: string) => Promise<boolean>;
  readGuest: () => Promise<string[]>;
  writeGuest: (ids: string[]) => Promise<boolean>;
  selectServer: (uid: string) => Promise<string[]>;
  /** Subset of the given ids the catalog confirms EXIST (FK-safe to insert). */
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
  const guest = await io.readGuest();

  // Atomically claim the absorbable snapshot BEFORE any server write. The claim
  // decision and its durable write happen under one lock, so a crash keeps the
  // snapshot bound to this user AND two overlapping handoffs can't both absorb
  // the same still-unclaimed ids. An empty snapshot also releases our own stale
  // claim inside this call.
  const snapshot = await io.claimSnapshot(uid, guest);
  if (snapshot === null) {
    return { done: false, serverIds: null }; // could not persist claim → retry
  }

  let serverIds: string[];
  try {
    serverIds = await io.selectServer(uid);
  } catch {
    return { done: false, serverIds: null }; // transient: keep guest + claims
  }

  if (snapshot.length === 0) {
    return { done: true, serverIds };
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
