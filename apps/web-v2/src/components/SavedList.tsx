"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { WorkshopCard } from "@/components/WorkshopCard";
import { getFavorites, FAVORITES_EVENT } from "@/lib/favorites";
import type { Workshop } from "@/lib/types";

export function SavedList() {
  const [ids, setIds] = useState<string[] | null>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  // track favorites (and live updates when the user un-saves from a card here)
  useEffect(() => {
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
    return <p className="py-16 text-center text-muted-foreground">جارٍ التحميل…</p>;
  }

  if (!workshops.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Heart size={40} className="text-muted-foreground/40" aria-hidden />
        <p className="text-muted-foreground">
          لا توجد كراجات محفوظة بعد. اضغط رمز القلب على أي كراج لحفظه هنا.
        </p>
        <Link
          href="/search"
          className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90"
        >
          ابدأ البحث
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
