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
import {
  dedupePreserveCase,
  handoffInserts,
  remainingAfterClear,
  unionFavorites,
} from "./favorites-sync";
import {
  clearGuestFavorites,
  readGuestFavorites,
  writeGuestFavorites,
} from "./guest-storage";
import {
  addServerFavorite,
  insertServerFavorites,
  removeServerFavorite,
  selectServerFavorites,
} from "./favorites-remote";

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

    async function handoffAndLoad(currentUid: string): Promise<boolean> {
      setLoading(true);
      const snapshot = await readGuestFavorites();

      let serverIds: string[];
      try {
        serverIds = await selectServerFavorites(currentUid);
      } catch {
        if (active) setLoading(false);
        return false;
      }

      const inserts = handoffInserts(snapshot, serverIds);
      if (inserts.length > 0) {
        try {
          await insertServerFavorites(currentUid, inserts);
          serverIds = unionFavorites(serverIds, inserts);
        } catch {
          if (active) {
            setFavorites(serverIds);
            setLoading(false);
          }
          return false;
        }
      }

      if (snapshot.length > 0) {
        const current = await readGuestFavorites();
        const cleared = await writeGuestFavorites(
          remainingAfterClear(current, snapshot)
        );
        // Server insertion is idempotent, so a failed local clear is safe to
        // retry without duplicating or losing favorites.
        if (!cleared) {
          if (active) {
            setFavorites(serverIds);
            setLoading(false);
          }
          return false;
        }
      }

      if (active) {
        setFavorites(serverIds);
        setLoading(false);
      }
      return true;
    }

    if (status === "loading") {
      setLoading(true);
      return;
    }

    if (status === "signedIn" && uid) {
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
          try {
            setFavorites(await selectServerFavorites(uid));
          } catch {
            setFavorites(previous);
          }
        }
      } else {
        const version = ++guestMutationVersion.current;
        const persisted = await writeGuestFavorites(next);
        // Do not let a late failed write roll back a newer user action.
        if (!persisted && guestMutationVersion.current === version) {
          setFavorites(previous);
        }
      }
    },
    [favorites, status, uid]
  );

  const resetAfterDeletion = useCallback(async () => {
    handledUid.current = null;
    handoffAttempts.current = 0;
    guestMutationVersion.current += 1;
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
