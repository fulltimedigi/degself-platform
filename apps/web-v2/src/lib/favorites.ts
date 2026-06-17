// Client-side favorites (no auth) — place_ids persisted in localStorage.
const KEY = "degself:favorites";
export const FAVORITES_EVENT = "degself:favorites-changed";

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function persist(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Safari private mode / quota exceeded — keep the UI responsive and still
    // notify listeners; the favorite just won't survive a reload.
  }
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT));
}

export function isFavorite(id: string): boolean {
  return getFavorites().includes(id);
}

/** Toggle a place_id; returns the new saved state. */
export function toggleFavorite(id: string): boolean {
  const ids = getFavorites();
  const i = ids.indexOf(id);
  if (i >= 0) {
    ids.splice(i, 1);
    persist(ids);
    return false;
  }
  ids.push(id);
  persist(ids);
  return true;
}
