// Favorites — one cohesive, auth-aware store.
//
// There are exactly TWO modes and the store (not the UI) decides which is live:
//   • guest         → localStorage ("degself:favorites") is the source of truth.
//   • authenticated → public.user_favorites (via the browser's authenticated
//                     Supabase client + RLS) is the source of truth.
//
// UI components stay simple: they read the current view with getFavorites()/
// isFavorite(), mutate with toggleFavorite(), and re-render on FAVORITES_EVENT.
// The mode switch, the Supabase reads/writes, and the guest→auth handoff all
// live here so that "if logged in → Supabase else localStorage" is never
// scattered across components.
//
// Pure merge/clear logic lives in ./favorites-sync (unit-tested there).

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  parseFavorites,
  dedupePreserveCase,
  unionFavorites,
  handoffInserts,
  remainingAfterClear,
} from "@/lib/favorites-sync";

const KEY = "degself:favorites";
export const FAVORITES_EVENT = "degself:favorites-changed";
const TABLE = "user_favorites";

type Mode = "guest" | "auth";

// In-memory view of the current favorites, kept in append (oldest-first) order
// so that /api/workshops?ids= (which reverses) renders newest-first.
let cache: string[] = [];
let mode: Mode = "guest";
let userId: string | null = null;
let supabase: SupabaseClient | null = null;
let initialized = false;

// Eagerly seed the cache from localStorage so the very first synchronous read
// (before the auth listener resolves) reflects guest favorites without a flash.
if (typeof window !== "undefined") {
  cache = readLocalStore();
}

// ── low-level helpers ───────────────────────────────────────────────────────

function readLocalStore(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return parseFavorites(localStorage.getItem(KEY));
  } catch {
    return [];
  }
}

/** Write the guest store verbatim (deduped, exact case). No cache/emit changes. */
function writeLocalStore(ids: readonly string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(dedupePreserveCase(ids)));
  } catch {
    // Safari private mode / quota — keep the UI responsive; the favorite just
    // may not survive a reload.
  }
}

function emit(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT));
}

function setCache(ids: string[]): void {
  cache = dedupePreserveCase(ids);
  emit();
}

function getClient(): SupabaseClient {
  if (!supabase) supabase = createBrowserSupabaseClient();
  return supabase;
}

// ── public read API (synchronous, view-of-cache) ────────────────────────────

export function getFavorites(): string[] {
  // In guest mode reflect localStorage live (cheap) so external tab writes and
  // pre-init reads stay correct; in auth mode the cache is authoritative.
  if (mode === "guest" && typeof window !== "undefined") cache = readLocalStore();
  return cache.slice();
}

export function isFavorite(id: string): boolean {
  if (mode === "guest" && typeof window !== "undefined") cache = readLocalStore();
  return cache.includes(id);
}

// ── public mutation API (optimistic; returns the new saved state) ────────────

export function toggleFavorite(id: string): boolean {
  if (mode === "auth" && userId) {
    const removing = cache.includes(id);
    setCache(removing ? cache.filter((x) => x !== id) : [...cache, id]);
    void persistAuthToggle(userId, id, removing);
    return !removing;
  }

  // guest — localStorage is the source of truth.
  const ids = readLocalStore();
  const i = ids.indexOf(id);
  const nowSaved = i < 0;
  if (i >= 0) ids.splice(i, 1);
  else ids.push(id);
  writeLocalStore(ids);
  setCache(ids);
  return nowSaved;
}

async function persistAuthToggle(
  uid: string,
  id: string,
  removing: boolean
): Promise<void> {
  try {
    const db = getClient();
    if (removing) {
      const { error } = await db
        .from(TABLE)
        .delete()
        .eq("user_id", uid)
        .eq("place_id", id);
      if (error) throw error;
    } else {
      const { error } = await db
        .from(TABLE)
        .upsert(
          { user_id: uid, place_id: id },
          { onConflict: "user_id,place_id", ignoreDuplicates: true }
        );
      if (error) throw error;
    }
  } catch {
    // Revert to server truth so the UI never lies about what was saved.
    if (mode === "auth" && userId === uid) await refreshFromServer(uid);
  }
}

// ── authenticated loading + guest→auth handoff ──────────────────────────────

/** Load this user's favorites (oldest-first) from Supabase into the cache. */
async function refreshFromServer(uid: string): Promise<string[]> {
  const db = getClient();
  const { data, error } = await db
    .from(TABLE)
    .select("place_id")
    .eq("user_id", uid)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const ids = dedupePreserveCase(
    (data ?? []).map((r) => (r as { place_id: string }).place_id)
  );
  if (mode === "auth" && userId === uid) setCache(ids);
  return ids;
}

/**
 * Runs on EVERY guest → authenticated transition (never a one-time flag).
 * Snapshot → UNION into Supabase → loss-safe clear of the transferred snapshot.
 */
async function handoffAndLoad(uid: string): Promise<void> {
  const snapshot = readLocalStore();

  let serverIds: string[];
  try {
    serverIds = await selectServerIds(uid);
  } catch {
    // Can't read server state — fall back to whatever is cached; leave the
    // guest store intact so the handoff can retry on a later transition.
    return;
  }

  const inserts = handoffInserts(snapshot, serverIds);

  if (inserts.length > 0) {
    try {
      const db = getClient();
      const { error } = await db.from(TABLE).upsert(
        inserts.map((place_id) => ({ user_id: uid, place_id })),
        { onConflict: "user_id,place_id", ignoreDuplicates: true }
      );
      if (error) throw error;
      serverIds = unionFavorites(serverIds, inserts);
    } catch {
      // Write failed: keep localStorage intact, do not clear, stay retryable.
      // Still surface server state (union unchanged) for display.
      if (mode === "auth" && userId === uid) setCache(serverIds);
      return;
    }
  }

  // Snapshot is now safely represented server-side → clear ONLY the snapshot,
  // preserving any id that appeared in the guest store during the transfer.
  if (snapshot.length > 0) {
    const current = readLocalStore();
    writeLocalStore(remainingAfterClear(current, snapshot));
  }

  if (mode === "auth" && userId === uid) setCache(serverIds);
}

async function selectServerIds(uid: string): Promise<string[]> {
  const db = getClient();
  const { data, error } = await db
    .from(TABLE)
    .select("place_id")
    .eq("user_id", uid)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return dedupePreserveCase(
    (data ?? []).map((r) => (r as { place_id: string }).place_id)
  );
}

// ── auth state wiring ───────────────────────────────────────────────────────

function toGuest(): void {
  mode = "guest";
  userId = null;
  setCache(readLocalStore());
}

async function toAuth(user: User): Promise<void> {
  const switching = mode !== "auth" || userId !== user.id;
  mode = "auth";
  userId = user.id;
  if (switching) {
    // New sign-in (or a different user after an account switch): merge guest
    // favorites in, then load. Loading alone (no handoff) for the same user.
    await handoffAndLoad(user.id);
  } else {
    try {
      await refreshFromServer(user.id);
    } catch {
      /* keep last known cache */
    }
  }
}

function applyUser(user: User | null): void {
  // Defer the async Supabase work out of the onAuthStateChange callback to
  // avoid the supabase-js re-entrancy deadlock.
  setTimeout(() => {
    if (user) void toAuth(user);
    else toGuest();
  }, 0);
}

/**
 * Initialize the auth-aware favorites store. Idempotent — safe to call from a
 * globally-mounted controller so the handoff runs after an OAuth return even on
 * pages that render no SaveButton.
 */
export function initFavoritesSync(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const db = getClient();
  // INITIAL_SESSION fires immediately with the current session, giving us the
  // starting mode; SIGNED_IN / SIGNED_OUT drive later transitions.
  db.auth.onAuthStateChange((_event, session) => {
    applyUser(session?.user ?? null);
  });
}

/**
 * Client-side cleanup after a confirmed account deletion: drop the guest store
 * and reset the view. (Auth sign-out separately flips the store back to guest.)
 */
export function clearGuestFavorites(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  mode = "guest";
  userId = null;
  setCache([]);
}
