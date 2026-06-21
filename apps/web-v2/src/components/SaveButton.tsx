"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { track } from "@/lib/track";
import { isFavorite, toggleFavorite, FAVORITES_EVENT } from "@/lib/favorites";

/** Heart toggle that saves a workshop to localStorage favorites (no auth). */
export function SaveButton({
  placeId,
  variant = "overlay",
}: {
  placeId: string;
  variant?: "overlay" | "inline";
}) {
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSaved(isFavorite(placeId));
    const sync = () => setSaved(isFavorite(placeId));
    window.addEventListener(FAVORITES_EVENT, sync);
    return () => window.removeEventListener(FAVORITES_EVENT, sync);
  }, [placeId]);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const now = toggleFavorite(placeId);
    setSaved(now);
    if (now) track("save", { place_id: placeId });
  }

  const label = saved ? "إزالة من المحفوظة" : "حفظ";

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        aria-label={label}
        title={label}
        className={
          "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition " +
          (saved
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-foreground hover:bg-muted")
        }
      >
        <Heart size={18} fill={mounted && saved ? "currentColor" : "none"} aria-hidden />
        {saved ? "محفوظ" : "حفظ"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur transition hover:bg-background"
    >
      <Heart
        size={17}
        className={mounted && saved ? "text-red-500" : "text-foreground/70"}
        fill={mounted && saved ? "currentColor" : "none"}
        aria-hidden
      />
    </button>
  );
}
