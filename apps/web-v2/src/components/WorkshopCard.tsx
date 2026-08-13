import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SpecialtyCover } from "@/components/SpecialtyCover";
import { StarRating } from "@/components/StarRating";
import { OpenNowBadge } from "@/components/OpenNowBadge";
import { SaveButton } from "@/components/SaveButton";
import { CardActions } from "@/components/CardActions";
import { serviceModeKey, reviewVolumeKey } from "@/lib/labels";
import { truncate, kuwaitWhatsAppDigits } from "@/lib/utils";
import type { Workshop } from "@/lib/types";
import type { Enrichment } from "@/lib/enrichment";

function VerifiedNetworkBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#FFD60A]/50 bg-[#FFD60A]/15 px-2 py-0.5 text-[11px] font-extrabold text-[#FFD60A]" title="كراج ضمن شبكة دق سلف الموثقة">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2.5 14.4 5l3.4-.3.7 3.3 3 1.7-1.7 3 1.7 3-3 1.7-.7 3.3-3.4-.3L12 22l-2.4-2.6-3.4.3-.7-3.3-3-1.7 1.7-3-1.7-3 3-1.7.7-3.3 3.4.3L12 2.5Zm-1.2 13.2 6-6-1.4-1.4-4.6 4.6-2.2-2.2-1.4 1.4 3.6 3.6Z" />
      </svg>
      موثق
    </span>
  );
}

export function WorkshopCard({
  workshop,
  distanceKm,
  enrichment,
}: {
  workshop: Workshop;
  distanceKm?: number | null;
  enrichment?: Enrichment | null;
}) {
  const t = useTranslations("card");
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
    is_partner,
  } = workshop;

  const volumeKey = reviewVolumeKey(google_reviews_count);
  const location = [neighborhood ?? area, governorate].filter(Boolean).join(" · ");
  const tel = (phone_intl || phone || "").replace(/[^\d+]/g, "");
  const waDigits = kuwaitWhatsAppDigits(phone_intl || phone);
  const effectiveSpecialty = reviewed_specialty || specialty;

  return (
    <div className={`surface surface-interactive group relative overflow-hidden rounded-2xl ${is_partner ? "order-first !border-[#FFD60A]/55" : ""}`}>
      <Link href={`/workshop/${place_id}`} className="block">
        <div className="flex items-stretch gap-3 p-3">
          <SpecialtyCover specialty={effectiveSpecialty} size={80} />

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="min-w-0 text-[15px] font-bold leading-tight transition group-hover:text-primary">
                  {truncate(name, 60)}
                </h3>
                {is_partner && <div className="mt-1"><VerifiedNetworkBadge /></div>}
              </div>
              <span className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {t(serviceModeKey(service_mode))}
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
              {enrichment ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-bold text-primary">
                  <span aria-hidden>★</span>
                  {Math.round(enrichment.smart_score)}
                </span>
              ) : (
                <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {t("registered")}
                </span>
              )}
              {google_rating != null && <StarRating rating={google_rating} />}
              {volumeKey && <span className="text-muted-foreground">{t(volumeKey)}</span>}
              <OpenNowBadge openingHours={opening_hours} />
              {distanceKm != null && (
                <span className="rounded-md bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                  {t("km", { n: distanceKm })}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      <div className="absolute right-2 top-2">
        <SaveButton placeId={place_id} />
      </div>

      {(tel || waDigits) && (
        <div className="border-t border-white/[0.06] px-3 py-2">
          <CardActions tel={tel} waDigits={waDigits} placeId={place_id} />
        </div>
      )}
    </div>
  );
}
