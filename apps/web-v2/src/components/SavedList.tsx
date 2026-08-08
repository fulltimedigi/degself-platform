"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Heart } from "lucide-react";
import { WorkshopCard } from "@/components/WorkshopCard";
import { getFavorites, FAVORITES_EVENT, initFavoritesSync } from "@/lib/favorites";
import type { Workshop } from "@/lib/types";

export function SavedList() {
  const t = useTranslations("misc.saved");
  const [ids, setIds] = useState<string[] | null>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  // track favorites (and live updates when the user un-saves from a card here)
  useEffect(() => {
    initFavoritesSync();
    const load = () => setIds(getFavorites());
    load();
    window.addEventListener(FAVORITES_EVENT, load);
    return () => window.removeEventListener(FAVORITES_EVENT, load);
  }, []);

  useEffect(() => {
    if (ids === null) return;
    if (ids.length === 0) {
      setWorkshops([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/workshops?ids=${encodeURIComponent(ids.join(","))}`)
      .then((r) => r.json())
      .then((d) => setWorkshops(d.workshops ?? []))
      .catch(() => setWorkshops([]))
      .finally(() => setLoading(false));
  }, [ids]);

  if (loading) {
    return <p className="py-16 text-center text-muted-foreground">{t("loading")}</p>;
  }

  if (!workshops.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Heart size={40} className="text-muted-foreground/40" aria-hidden />
        <p className="text-muted-foreground">{t("empty")}</p>
        <Link
          href="/search"
          className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90"
        >
          {t("startSearch")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {workshops.map((w) => (
        <WorkshopCard key={w.place_id} workshop={w} />
      ))}
    </div>
  );
}
