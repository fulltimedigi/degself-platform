import Link from "next/link";
import { WorkshopCard } from "@/components/WorkshopCard";
import type { Workshop } from "@/lib/types";

export function TopRatedCarousel({ workshops }: { workshops: Workshop[] }) {
  if (workshops.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">الأعلى تقييماً</h2>
        <Link
          href="/search?sort=top-rated"
          className="text-sm font-semibold text-primary hover:underline"
        >
          عرض الكل
        </Link>
      </div>

      {/* horizontal snap carousel */}
      <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
        {workshops.map((w) => (
          <div key={w.place_id} className="w-72 shrink-0 snap-start">
            <WorkshopCard workshop={w} />
          </div>
        ))}
      </div>
    </div>
  );
}
