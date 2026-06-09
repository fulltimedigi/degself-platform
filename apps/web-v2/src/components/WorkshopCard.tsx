import Link from "next/link";
import { BrandedCover } from "@/components/BrandedCover";
import { StarRating } from "@/components/StarRating";
import { serviceModeLabel, reviewVolumeLabel } from "@/lib/labels";
import { truncate } from "@/lib/utils";
import type { Workshop } from "@/lib/types";

export function WorkshopCard({ workshop }: { workshop: Workshop }) {
  const {
    place_id,
    name,
    entity_type,
    area,
    governorate,
    service_mode,
    google_rating,
    google_reviews_count,
  } = workshop;

  const volume = reviewVolumeLabel(google_reviews_count);
  const location = [area, governorate].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/workshop/${place_id}`} // place_id verbatim — never lowercased
      className="group block overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/50"
    >
      {/* decorative cover — fixed 160px, no Google images, no name text */}
      <div className="h-40 w-full">
        <BrandedCover name={name} entityType={entity_type} />
      </div>

      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-bold leading-tight">{truncate(name, 60)}</h3>
          <span className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {serviceModeLabel(service_mode)}
          </span>
        </div>

        {location && <p className="text-xs text-muted-foreground">{location}</p>}

        <div className="flex items-center gap-2 text-xs">
          {google_rating != null && <StarRating rating={google_rating} />}
          {volume && <span className="text-muted-foreground">{volume}</span>}
        </div>
      </div>
    </Link>
  );
}
