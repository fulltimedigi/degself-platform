"use client";

import { track } from "@vercel/analytics";

/** tel: link that logs a "call" event (which workshop was called). */
export function CallButton({
  tel,
  display,
  placeId,
}: {
  tel: string;
  display: string;
  placeId: string;
}) {
  return (
    <a
      href={`tel:${tel}`}
      dir="ltr"
      className="font-semibold text-primary"
      onClick={() => track("call", { place_id: placeId })}
    >
      {display}
    </a>
  );
}
