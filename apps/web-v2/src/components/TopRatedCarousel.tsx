import Link from "next/link";
import { WorkshopCard } from "@/components/WorkshopCard";
import { ScrollRow } from "@/components/ScrollRow";
import type { Workshop } from "@/lib/types";

export function TopRatedCarousel({ workshops }: { workshops: Workshop[] }) {
  if (workshops.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-7 w-1 rounded-full bg-primary" aria-hidden />
          <div className="flex flex-col">
            <h2 className="text-xl font-extrabold sm:text-2xl">الأعلى تقييماً</h2>
            <p className="text-xs text-muted-foreground">أفضل الكراجات بناءً على تقييمات Google</p>
          </div>
        </div>
        <Link
          href="/search?sort=top-rated"
          className="shrink-0 rounded-lg border border-primary/30 px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-primary/10"
        >
          عرض الكل ←
        </Link>
      </div>

      {/* horizontal snap carousel with leading-edge fade affordance */}
      <ScrollRow className="gap-4 pb-2">
        {workshops.map((w) => (
          <div key={w.place_id} className="w-[340px] shrink-0 snap-start">
            <WorkshopCard workshop={w} />
          </div>
        ))}
      </ScrollRow>
    </div>
  );
}
