import Link from "next/link";
import { BrandedCover } from "@/components/BrandedCover";
import { StarRating } from "@/components/StarRating";
import { OpenNowBadge } from "@/components/OpenNowBadge";
import { SaveButton } from "@/components/SaveButton";
import { CardActions } from "@/components/CardActions";
import { serviceModeLabel, reviewVolumeLabel } from "@/lib/labels";
import { truncate, kuwaitWhatsAppDigits } from "@/lib/utils";
import type { Workshop } from "@/lib/types";

export function WorkshopCard({
  workshop,
  distanceKm,
}: {
  workshop: Workshop;
  distanceKm?: number | null;
}) {
  const {
    place_id,
    name,
    entity_type,
    area,
    neighborhood,
    governorate,
    service_mode,
    google_rating,
    google_reviews_count,
    opening_hours,
    phone,
    phone_intl,
  } = workshop;

  const volume = reviewVolumeLabel(google_reviews_count);
  // prefer the Google-authoritative neighborhood (الحي) over the free-text area
  const location = [neighborhood ?? area, governorate].filter(Boolean).join(" · ");
  const tel = (phone_intl || phone || "").replace(/[^\d+]/g, "");
  const waDigits = kuwaitWhatsAppDigits(phone_intl || phone);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10">
      <Link href={`/workshop/${place_id}`} className="block">
        {/* decorative cover — fixed 160px, no Google images, no name text */}
        <div className="h-40 w-full">
          <BrandedCover name={name} entityType={entity_type} />
        </div>

        <div className="flex flex-col gap-2.5 p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-bold leading-tight transition group-hover:text-primary">{truncate(name, 60)}</h3>
            <span className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {serviceModeLabel(service_mode)}
            </span>
          </div>

          {location && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {location}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {google_rating != null && <StarRating rating={google_rating} />}
            {volume && <span className="text-muted-foreground">{volume}</span>}
            <OpenNowBadge openingHours={opening_hours} />
            {distanceKm != null && (
              <span className="rounded-md bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                {distanceKm} كم
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* save heart — sits over the cover, outside the link */}
      <div className="absolute right-2 top-2">
        <SaveButton placeId={place_id} />
      </div>

      {/* call / whatsapp actions */}
      {(tel || waDigits) && (
        <div className="px-4 pb-4 pt-1">
          <CardActions tel={tel} waDigits={waDigits} placeId={place_id} />
        </div>
      )}
    </div>
  );
}
