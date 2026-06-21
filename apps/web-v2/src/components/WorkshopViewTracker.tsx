"use client";

import { useEffect } from "react";
import { track } from "@/lib/track";

/** Fires a "view_workshop" event (→ Snap VIEW_CONTENT) once per workshop page view. */
export function WorkshopViewTracker({ placeId }: { placeId: string }) {
  useEffect(() => {
    track("view_workshop", { place_id: placeId });
  }, [placeId]);
  return null;
}
