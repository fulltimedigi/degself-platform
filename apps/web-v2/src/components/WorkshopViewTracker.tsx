"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { track } from "@/lib/track";

/** Fires a privacy-safe "view_workshop" event once per workshop page view. */
export function WorkshopViewTracker({ placeId }: { placeId: string }) {
  const locale = useLocale();

  useEffect(() => {
    track("view_workshop", {
      place_id: placeId,
      source: "workshop_page",
      locale,
    });
  }, [locale, placeId]);

  return null;
}
