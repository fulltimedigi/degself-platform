"use client";

import { useLocale } from "next-intl";
import { track } from "@/lib/track";

/** tel: link that logs a privacy-safe workshop contact event. */
export function CallButton({
  tel,
  display,
  placeId,
}: {
  tel: string;
  display: string;
  placeId: string;
}) {
  const locale = useLocale();

  return (
    <a
      href={`tel:${tel}`}
      dir="ltr"
      className="font-semibold text-primary"
      onClick={() =>
        track("call", {
          place_id: placeId,
          source: "workshop_page",
          locale,
          channel: "phone",
        })
      }
    >
      {display}
    </a>
  );
}
