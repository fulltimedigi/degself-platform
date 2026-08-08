"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/track";
import { isFavorite, toggleFavorite, FAVORITES_EVENT } from "@/lib/favorites";

type CustomSection = {
  title: string;
  items: Array<{ label: string; value: string }>;
};

/** Heart toggle that saves a workshop to localStorage favorites (no auth). */
export function SaveButton({
  placeId,
  variant = "overlay",
}: {
  placeId: string;
  variant?: "overlay" | "inline";
}) {
  const t = useTranslations("save");
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);

  useEffect(() => {
    setMounted(true);
    setSaved(isFavorite(placeId));
    const sync = () => setSaved(isFavorite(placeId));
    window.addEventListener(FAVORITES_EVENT, sync);
    return () => window.removeEventListener(FAVORITES_EVENT, sync);
  }, [placeId]);

  useEffect(() => {
    if (variant !== "inline") return;
    let cancelled = false;
    fetch(`/api/workshops/${encodeURIComponent(placeId)}/media`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.custom_sections)) {
          setCustomSections(data.custom_sections as CustomSection[]);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [placeId, variant]);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const now = toggleFavorite(placeId);
    setSaved(now);
    if (now) track("save", { place_id: placeId });
  }

  const label = saved ? t("remove") : t("save");

  if (variant === "inline") {
    return (
      <div className="space-y-4">
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
          {saved ? t("saved") : t("save")}
        </button>

        {customSections.map((section, sectionIndex) => (
          <section
            key={`${section.title}-${sectionIndex}`}
            className="rounded-xl border border-border bg-card p-4"
          >
            <h2 className="font-bold">{section.title}</h2>
            {section.items.length > 0 && (
              <dl className="mt-3 divide-y divide-border">
                {section.items.map((item, itemIndex) => (
                  <div
                    key={`${item.label}-${itemIndex}`}
                    className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                  >
                    <dt className="text-sm text-muted-foreground">{item.label}</dt>
                    <dd className="text-sm font-bold text-foreground">{item.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        ))}
      </div>
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
