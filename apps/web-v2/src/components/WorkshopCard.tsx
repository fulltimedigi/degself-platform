import Link from "next/link";
import { SpecialtyCover } from "@/components/SpecialtyCover";
import { StarRating } from "@/components/StarRating";
import { OpenNowBadge } from "@/components/OpenNowBadge";
import { SaveButton } from "@/components/SaveButton";
import { CardActions } from "@/components/CardActions";
import { serviceModeLabel, reviewVolumeLabel } from "@/lib/labels";
import { truncate, kuwaitWhatsAppDigits } from "@/lib/utils";
import type { Workshop } from "@/lib/types";
import type { Enrichment } from "@/lib/enrichment";

export function WorkshopCard({
  workshop,
  distanceKm,
  enrichment,
}: {
  workshop: Workshop;
  distanceKm?: number | null;
  enrichment?: Enrichment | null;
}) {
  const {
    place_id,
    name,
    area,
    neighborhood,
    governorate,
    service_mode,
    google_rating,
    google_reviews_count,
    opening_hours,
    phone,
    phone_intl,
    specialty,
    reviewed_specialty,
  } = workshop;

  const volume = reviewVolumeLabel(google_reviews_count);
  // prefer the Google-authoritative neighborhood (الحي) over the free-text area
  const location = [neighborhood ?? area, governorate].filter(Boolean).join(" · ");
  const tel = (phone_intl || phone || "").replace(/[^\d+]/g, "");
  const waDigits = kuwaitWhatsAppDigits(phone_intl || phone);
  // public site reads reviewed_specialty when present (audited), falls back to legacy
  const effectiveSpecialty = reviewed_specialty || specialty;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10">
      <Link href={`/workshop/${place_id}`} className="block">
        <div className="flex items-stretch gap-3 p-3">
          {/* specialty icon cover — 80px, accent-tinted */}
          <SpecialtyCover specialty={effectiveSpecialty} size={80} />

          {/* main content column */}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 text-[15px] font-bold leading-tight transition group-hover:text-primary">
                {truncate(name, 60)}
              </h3>
              <span className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {serviceModeLabel(service_mode)}
              </span>
            </div>

            {location && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {location}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* degself smart score — glows; or a neutral "registered" badge when unscored */}
              {enrichment ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/15 px-2 py-0.5 font-bold text-primary shadow-[0_0_10px_rgba(255,214,10,0.35)]">
                  ⭐ {Math.round(enrichment.smart_score)}
                </span>
              ) : (
                <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  كراج مُسجَّل
                </span>
              )}
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
        </div>
      </Link>

      {/* save heart — sits over the specialty cover (logical-start), outside the link */}
      <div className="absolute right-2 top-2">
        <SaveButton placeId={place_id} />
      </div>

      {/* call / whatsapp actions */}
      {(tel || waDigits) && (
        <div className="border-t border-border/60 px-3 py-2">
          <CardActions tel={tel} waDigits={waDigits} placeId={place_id} />
        </div>
      )}
    </div>
  );
}
