"use client";

import { useEffect } from "react";
import { initFavoritesSync } from "@/lib/favorites";

/**
 * Mounts once (in the locale layout) to initialize the auth-aware favorites
 * store. This guarantees the guest → authenticated handoff runs after an OAuth
 * return even on pages that render no SaveButton. Renders nothing.
 */
export function FavoritesSync() {
  useEffect(() => {
    initFavoritesSync();
  }, []);
  return null;
}
