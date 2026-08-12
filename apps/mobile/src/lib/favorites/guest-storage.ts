import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseFavorites, serializeFavorites } from "./favorites-sync";
import {
  parseHandoffClaims,
  serializeHandoffClaims,
  withClaim,
  withoutClaim,
  type HandoffClaims,
} from "./favorites-handoff";

const KEY = "degself:favorites";
// Durable handoff claim MAP (survives process restart), keyed by user id. Holds
// which identity is absorbing which guest snapshot so a crash between the server
// write and the guest clear can never let a different account inherit a
// snapshot. Contains only user ids + public place_ids — never a token or secret.
const CLAIM_KEY = "degself:favorites:handoff-claims";

export async function readGuestFavorites(): Promise<string[]> {
  try {
    return parseFavorites(await AsyncStorage.getItem(KEY));
  } catch {
    return [];
  }
}

/**
 * Persist guest favorites and report whether the write really succeeded. The
 * caller can then roll back an optimistic UI update instead of claiming a save
 * that will disappear on restart when device storage is unavailable/full.
 */
export async function writeGuestFavorites(
  ids: readonly string[]
): Promise<boolean> {
  try {
    await AsyncStorage.setItem(KEY, serializeFavorites(ids));
    return true;
  } catch {
    return false;
  }
}

export async function clearGuestFavorites(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}

// The claim map is mutated by read-modify-write. Serialize those mutations
// through a single in-process promise chain so a fast account switch (two
// handoffs overlapping) can never interleave and drop one user's claim entry.
let claimMutex: Promise<unknown> = Promise.resolve();
function withClaimLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = claimMutex.then(fn, fn);
  claimMutex = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

/** Read the durable handoff claim map (empty object if none / corrupt). */
export async function readHandoffClaims(): Promise<HandoffClaims> {
  try {
    return parseHandoffClaims(await AsyncStorage.getItem(CLAIM_KEY));
  } catch {
    return {};
  }
}

/**
 * Durably record which identity is absorbing a snapshot, preserving any OTHER
 * user's existing claim. MUST be persisted before the first server write of a
 * handoff so a crash cannot expose the snapshot to another account. Returns
 * false if the write did not land.
 */
export async function writeHandoffClaim(
  uid: string,
  ids: readonly string[]
): Promise<boolean> {
  return withClaimLock(async () => {
    try {
      const claims = parseHandoffClaims(await AsyncStorage.getItem(CLAIM_KEY));
      await AsyncStorage.setItem(
        CLAIM_KEY,
        serializeHandoffClaims(withClaim(claims, uid, ids))
      );
      return true;
    } catch {
      return false;
    }
  });
}

/** Remove ONE user's claim once its snapshot is fully accounted for. */
export async function clearHandoffClaim(uid: string): Promise<boolean> {
  return withClaimLock(async () => {
    try {
      const claims = parseHandoffClaims(await AsyncStorage.getItem(CLAIM_KEY));
      const next = withoutClaim(claims, uid);
      if (Object.keys(next).length === 0) {
        await AsyncStorage.removeItem(CLAIM_KEY);
      } else {
        await AsyncStorage.setItem(CLAIM_KEY, serializeHandoffClaims(next));
      }
      return true;
    } catch {
      return false;
    }
  });
}

/** Drop the entire claim map (used only when wiping local state after deletion). */
export async function clearAllHandoffClaims(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(CLAIM_KEY);
    return true;
  } catch {
    return false;
  }
}
