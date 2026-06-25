import { WorkshopCard } from "@/components/WorkshopCard";
import { getEnrichment } from "@/lib/enrichment";
import type { Workshop } from "@/lib/types";

/**
 * "كراجات مشابهة" — internal-linking section on the workshop page. Renders only
 * when there are at least 3 matches (a 1–2 item row reads like an error). Reuses
 * WorkshopCard so cards look identical to search/index, with the review-analysis
 * overlay attached when available.
 */
export function SimilarWorkshops({ workshops }: { workshops: Workshop[] }) {
  if (workshops.length < 3) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-lg font-bold">كراجات مشابهة</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workshops.map((w) => (
          <WorkshopCard
            key={w.place_id}
            workshop={w}
            enrichment={getEnrichment(w.place_id)}
          />
        ))}
      </div>
    </section>
  );
}
