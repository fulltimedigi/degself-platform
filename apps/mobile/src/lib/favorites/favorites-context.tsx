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

// Auth-aware favorites, mirroring the web store's two-mode contract:
//   • guest         → AsyncStorage is the source of truth
//   • authenticated → public.user_favorites via RLS is the source of truth
// The mode switch, the Supabase reads/writes, and the loss-safe guest→auth
// handoff all live here so screens just read `favorites`/`isFavorite` and call
// `toggle`. Pure merge/clear logic is in ./favorites-sync (unit-tested).

type FavoritesContextValue = {
  favorites: string[];
  loading: boolean;
  isFavorite: (placeId: string) => boolean;
  toggle: (placeId: string) => Promise<void>;
  /** Drop the guest store + reset view (after a confirmed account deletion). */
  resetAfterDeletion: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  // The uid whose handoff/load has already run, so a re-render never re-hands-off.
  const handledUid = useRef<string | null>(null);

  const uid = user?.id ?? null;

  useEffect(() => {
    let active = true;

    async function loadGuest() {
      const ids = await readGuestFavorites();
      if (active) {
        setFavorites(ids);
        setLoading(false);
      }
    }

    async function handoffAndLoad(currentUid: string) {
      setLoading(true);
      const snapshot = await readGuestFavorites();

      let serverIds: string[];
      try {
        serverIds = await selectServerFavorites(currentUid);
      } catch {
        // Can't read server — leave guest store intact so a later transition
        // retries the handoff; show whatever we can.
        if (active) setLoading(false);
        return;
      }

      const inserts = handoffInserts(snapshot, serverIds);
      if (inserts.length > 0) {
        try {
          await insertServerFavorites(currentUid, inserts);
          serverIds = unionFavorites(serverIds, inserts);
        } catch {
          // Write failed: keep localStorage intact, do not clear, stay retryable.
          if (active) {
            setFavorites(serverIds);
            setLoading(false);
          }
          return;
        }
      }

      // Snapshot is now safely server-side → clear ONLY the snapshot, preserving
      // any id added to the guest store during the in-flight transfer.
      if (snapshot.length > 0) {
        const current = await readGuestFavorites();
        await writeGuestFavorites(remainingAfterClear(current, snapshot));
      }

      if (active) {
        setFavorites(serverIds);
        setLoading(false);
      }
    }

    if (status === "loading") {
      setLoading(true);
      return;
    }

    if (status === "signedIn" && uid) {
      if (handledUid.current !== uid) {
        handledUid.current = uid;
        void handoffAndLoad(uid);
      }
    } else {
      // signedOut
      handledUid.current = null;
      void loadGuest();
    }

    return () => {
      active = false;
    };
  }, [status, uid]);

  const isFavorite = useCallback(
    (placeId: string) => favorites.includes(placeId),
    [favorites]
  );

  const toggle = useCallback(
    async (placeId: string) => {
      const currentlySaved = favorites.includes(placeId);
      const next = currentlySaved
        ? favorites.filter((x) => x !== placeId)
        : dedupePreserveCase([...favorites, placeId]);

      // Optimistic update.
      setFavorites(next);

      if (status === "signedIn" && uid) {
        try {
          if (currentlySaved) await removeServerFavorite(uid, placeId);
          else await addServerFavorite(uid, placeId);
        } catch {
          // Revert to server truth so the UI never lies about what was saved.
          try {
            setFavorites(await selectServerFavorites(uid));
          } catch {
            setFavorites(favorites); // fall back to the pre-toggle view
          }
        }
      } else {
        await writeGuestFavorites(next);
      }
    },
    [favorites, status, uid]
  );

  const resetAfterDeletion = useCallback(async () => {
    handledUid.current = null;
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
