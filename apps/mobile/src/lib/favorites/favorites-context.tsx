import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { dedupePreserveCase } from "./favorites-sync";
import { shouldRollbackGuestWrite } from "./favorites-handoff";
import {
  performGuestHandoff,
  type HandoffIO,
} from "./favorites-handoff-runner";
import {
  claimAbsorbableSnapshot,
  clearAllHandoffClaims,
  clearGuestFavorites,
  clearHandoffClaim,
  readGuestFavorites,
  writeGuestFavorites,
} from "./guest-storage";
import {
  addServerFavorite,
  insertServerFavorites,
  removeServerFavorite,
  selectServerFavorites,
} from "./favorites-remote";
import { fetchExistingPlaceIds } from "@/lib/workshops/api";

// Real side effects for the pure handoff runner. The runner holds all the
// crash-safe ordering; this just wires it to device storage + Supabase.
const handoffIO: HandoffIO = {
  claimSnapshot: claimAbsorbableSnapshot,
  clearClaim: clearHandoffClaim,
  readGuest: readGuestFavorites,
  writeGuest: writeGuestFavorites,
  selectServer: selectServerFavorites,
  fetchEligible: fetchExistingPlaceIds,
  insertServer: insertServerFavorites,
};

type FavoritesContextValue = {
  favorites: string[];
  loading: boolean;
  isFavorite: (placeId: string) => boolean;
  toggle: (placeId: string) => Promise<void>;
  resetAfterDeletion: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);
const HANDOFF_RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000] as const;

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [handoffRetryKey, setHandoffRetryKey] = useState(0);
  const handledUid = useRef<string | null>(null);
  const handoffAttempts = useRef(0);
  const guestMutationVersion = useRef(0);
  // Identity currently owning the UI. Any async result scoped to a different id
  // must never be written into state (prevents cross-user display leakage on a
  // fast account switch — see toggle recovery below).
  const activeUidRef = useRef<string | null>(null);

  const uid = user?.id ?? null;

  useEffect(() => {
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadGuest() {
      const ids = await readGuestFavorites();
      if (active) {
        setFavorites(ids);
        setLoading(false);
      }
    }

    // Durable, crash-safe guest→account transfer. All ordering lives in the pure
    // runner; here we only reflect its result into UI state. Returns true only
    // when the snapshot is fully accounted for; a transient failure returns false
    // so the effect retries, while the durable claim keeps the snapshot bound to
    // THIS user across restarts (and out of any other account's reach).
    async function handoffAndLoad(currentUid: string): Promise<boolean> {
      setLoading(true);
      const result = await performGuestHandoff(currentUid, handoffIO);
      if (active) {
        if (result.serverIds) setFavorites(result.serverIds);
        setLoading(false);
      }
      return result.done;
    }

    if (status === "loading") {
      setLoading(true);
      return;
    }

    if (status === "signedIn" && uid) {
      activeUidRef.current = uid;
      if (handledUid.current !== uid) {
        void handoffAndLoad(uid).then((success) => {
          if (!active) return;
          if (success) {
            handledUid.current = uid;
            handoffAttempts.current = 0;
            return;
          }

          const attempt = handoffAttempts.current;
          if (attempt < HANDOFF_RETRY_DELAYS_MS.length) {
            handoffAttempts.current += 1;
            retryTimer = setTimeout(() => {
              if (active) setHandoffRetryKey((value) => value + 1);
            }, HANDOFF_RETRY_DELAYS_MS[attempt]);
          }
        });
      }
    } else {
      activeUidRef.current = null;
      handledUid.current = null;
      handoffAttempts.current = 0;
      void loadGuest();
    }

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [status, uid, handoffRetryKey]);

  const isFavorite = useCallback(
    (placeId: string) => favorites.includes(placeId),
    [favorites]
  );

  const toggle = useCallback(
    async (placeId: string) => {
      const currentlySaved = favorites.includes(placeId);
      const previous = favorites;
      const next = currentlySaved
        ? favorites.filter((x) => x !== placeId)
        : dedupePreserveCase([...favorites, placeId]);

      setFavorites(next);

      if (status === "signedIn" && uid) {
        try {
          if (currentlySaved) await removeServerFavorite(uid, placeId);
          else await addServerFavorite(uid, placeId);
        } catch {
          // Recover from the server, but only if THIS user still owns the UI.
          // Without the guard, an A-scoped recovery resolving after an A→B
          // switch would paint A's favorites into B's session.
          if (activeUidRef.current !== uid) return;
          try {
            const serverIds = await selectServerFavorites(uid);
            if (activeUidRef.current === uid) setFavorites(serverIds);
          } catch {
            if (activeUidRef.current === uid) setFavorites(previous);
          }
        }
      } else {
        const version = ++guestMutationVersion.current;
        const persisted = await writeGuestFavorites(next);
        // Roll back the optimistic toggle if the write really failed — but not if
        // a newer toggle has since superseded it.
        if (
          shouldRollbackGuestWrite(persisted, version, guestMutationVersion.current)
        ) {
          setFavorites(previous);
        }
      }
    },
    [favorites, status, uid]
  );

  const resetAfterDeletion = useCallback(async () => {
    const deletedUid = activeUidRef.current;
    handledUid.current = null;
    handoffAttempts.current = 0;
    guestMutationVersion.current += 1;
    activeUidRef.current = null;
    // Clear only the deleted user's claim (not other identities' claims on this
    // device); fall back to a full wipe only if the uid is unknown.
    if (deletedUid) await clearHandoffClaim(deletedUid);
    else await clearAllHandoffClaims();
    await clearGuestFavorites();
    setFavorites([]);
  }, []);

  const value = useMemo<FavoritesContextValue>(
    () => ({ favorites, loading, isFavorite, toggle, resetAfterDeletion }),
    [favorites, loading, isFavorite, toggle, resetAfterDeletion]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within <FavoritesProvider>");
  return ctx;
}
