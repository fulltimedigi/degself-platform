"use client";

import { useEffect, useState } from "react";
import { isOpenNow } from "@/lib/hours";

/** Live "open now / closed" badge (computed client-side in Kuwait time). */
export function OpenNowBadge({ openingHours }: { openingHours: string | null }) {
  // null until mounted → avoids SSR/client hydration mismatch
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    if (openingHours) setOpen(isOpenNow(openingHours));
  }, [openingHours]);

  if (open === null) return null;

  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold " +
        (open ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground")
      }
    >
      <span
        className={"h-2 w-2 rounded-full " + (open ? "bg-green-400" : "bg-muted-foreground")}
      />
      {open ? "مفتوح الآن" : "مغلق الآن"}
    </span>
  );
}
