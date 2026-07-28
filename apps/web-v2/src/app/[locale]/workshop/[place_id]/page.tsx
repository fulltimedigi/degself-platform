import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import {
  getWorkshop,
  getAllPlaceIds,
  getCuratedMechanicPlaceIds,
  getSimilarWorkshops,
} from "@/lib/workshops";
import type { Workshop } from "@/lib/types";
import { SimilarWorkshops } from "@/components/SimilarWorkshops";
import { getLandingCombos, LANDING_SPECIALTIES } from "@/lib/landing";
import { BrandedCover } from "@/components/BrandedCover";
import { StarRating } from "@/components/StarRating";
import { OpenNowBadge } from "@/components/OpenNowBadge";
import { HoursTable } from "@/components/HoursTable";
import { WorkshopJsonLd } from "@/components/WorkshopJsonLd";
import { JsonLd } from "@/components/JsonLd";
import { CallButton } from "@/components/CallButton";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { SaveButton } from "@/components/SaveButton";
import { ReviewForm } from "@/components/ReviewForm";
import { getApprovedReviews } from "@/lib/reviews";
import { serviceModeKey, reviewVolumeKey } from "@/lib/labels";
import { kuwaitWhatsAppDigits, formatArabicDate, truncate } from "@/lib/utils";
import { BUSINESS_WA } from "@/lib/constants";
import { getEnrichment } from "@/lib/enrichment";
import {
  TrustBanner,
  SmartScore,
  EnrichmentSummary,
  EnrichmentTags,
} from "@/components/ReviewInsights";
import { WorkshopViewTracker } from "@/components/WorkshopViewTracker";

const SITE = "https://degself.com";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

// Factual meta description for garages without a review-analysis overlay. Uses
// only the garage's own data fields (specialty, brand focus, area) — never
// review claims or invented analysis.
function factualDescription(w: Workshop, t: Translator): string {
  const focus =
    w.specialty_hints && w.specialty_hints.length > 0
      ? t("descFocusHints", { specialty: w.specialty, hints: w.specialty_hints.join("، ") })
      : w.specialty;
  const where = w.area ? t("descWhereArea", { area: w.area }) : t("descWhereGeneric");
  return t("descTemplate", { focus, where });
}

export const revalidate = 86400; // daily ISR
export const dynamicParams = true; // place_ids beyond the pre-rendered set build on demand

export async function generateStaticParams() {
  const [topByReviews, curatedMechs] = await Promise.all([
    getAllPlaceIds(500),
    getCuratedMechanicPlaceIds(),
  ]);
  const ids = Array.from(new Set([...topByReviews, ...curatedMechs]));
  return ids.map((place_id) => ({ place_id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; place_id: string }>;
}): Promise<Metadata> {
  const { locale, place_id } = await params;
  const t = await getTranslations({ locale, namespace: "workshop" });
  const w = await getWorkshop(place_id);
  if (!w) return { title: t("notFound") };
  const enrichment = getEnrichment(place_id);
  const description = enrichment?.summary_ar
    ? truncate(enrichment.summary_ar, 160)
    : truncate(factualDescription(w, t), 160);
  const titleSpecialty = w.reviewed_specialty ?? w.specialty;
  const titleLoc = w.area ? ` ${t("inArea", { area: w.area })}` : "";
  return {
    title: `${w.name} — ${titleSpecialty}${titleLoc} | دق سلف`,
    description,
    alternates: { canonical: `${SITE}/workshop/${place_id}` },
  };
}

export default async function WorkshopPage({
  params,
}: {
  params: Promise<{ locale: string; place_id: string }>;
}) {
  const { locale, place_id } = await params; // verbatim — case-sensitive, never transform
  const t = await getTranslations({ locale, namespace: "workshop" });
  const tc = await getTranslations({ locale, namespace: "card" });
  const w = await getWorkshop(place_id);
  if (!w) notFound();

  const [reviewSummary, similar, landingCombos] = await Promise.all([
    getApprovedReviews(place_id),
    getSimilarWorkshops(w.place_id, w.area, w.reviewed_specialty ?? w.specialty),
    getLandingCombos(),
  ]);
  const enrichment = getEnrichment(place_id);

  const volumeKey = reviewVolumeKey(w.google_reviews_count);
  const location = [w.area, w.governorate].filter(Boolean).join(" · ");
  const telHref = (w.phone_intl || w.phone || "").replace(/[^\d+]/g, "");
  const waDigits = kuwaitWhatsAppDigits(w.phone_intl || w.phone); // mobile-only
  const services = [...new Set([w.specialty, ...(w.specialty_hints ?? [])])].filter(Boolean);

  const landingSpec = LANDING_SPECIALTIES.find((s) => s.label === w.reviewed_specialty);
  const slug = landingSpec?.slug;
  const hasSpecialtyIndex = !!slug && landingCombos.some((c) => c.specialty === slug);
  const hasAreaLanding =
    !!slug && !!w.area && landingCombos.some((c) => c.specialty === slug && c.area === w.area);

  const crumbs: { name: string; href: string }[] = [{ name: t("breadcrumbHome"), href: "/" }];
  if (hasSpecialtyIndex && landingSpec) {
    crumbs.push({ name: t("breadcrumbSpecialty", { specialty: landingSpec.label }), href: `/كراج/${slug}` });
  } else {
    crumbs.push({ name: t("breadcrumbAll"), href: "/search" });
  }
  if (hasAreaLanding && landingSpec) {
    crumbs.push({ name: t("breadcrumbSpecArea", { specialty: landingSpec.label, area: w.area ?? "" }), href: `/كراج/${slug}/${w.area}` });
  }
  crumbs.push({ name: w.name, href: `/workshop/${w.place_id}` });

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${SITE}${c.href}`,
    })),
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <WorkshopJsonLd workshop={w} reviews={reviewSummary} />
      <JsonLd data={breadcrumbLd} />
      <WorkshopViewTracker placeId={w.place_id} />

      {/* Breadcrumb trail (visible + matches the BreadcrumbList JSON-LD) */}
      <nav aria-label={t("navAria")} className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={c.href} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden>/</span>}
              {last ? (
                <span className="line-clamp-1 text-foreground/80">{c.name}</span>
              ) : (
                <Link href={c.href} className="hover:text-foreground">
                  {c.name}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      {/* Hero */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        <div className="aspect-[16/7] w-full">
          <BrandedCover name={w.name} entityType={w.entity_type} specialty={w.specialty} />
        </div>
      </div>

      <div className="mt-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold leading-tight">{w.name}</h1>
          {location && <p className="mt-1 text-muted-foreground">{location}</p>}
        </div>
        <span className="shrink-0 rounded-md bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">
          {tc(serviceModeKey(w.service_mode))}
        </span>
      </div>

      {/* Trust signal — degself review analysis, directly after the title */}
      {enrichment && <TrustBanner signal={enrichment.trust_signal} />}

      {/* degself summary (rewritten analysis, never a verbatim Google review) */}
      {enrichment && <EnrichmentSummary summary={enrichment.summary_ar} />}

      {/* Smart score (0–100) */}
      {enrichment && <SmartScore enrichment={enrichment} />}

      {/* Google rating + live open-now */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        {w.google_rating != null && (
          <span className="flex items-center gap-2">
            <StarRating rating={w.google_rating} />
            {volumeKey && <span className="text-muted-foreground">{tc(volumeKey)}</span>}
          </span>
        )}
        <OpenNowBadge openingHours={w.opening_hours} />
      </div>

      <div className="mt-4">
        <SaveButton placeId={w.place_id} variant="inline" />
      </div>

      {/* What sets this garage apart + customer notes (degself tag analysis) */}
      {enrichment && <EnrichmentTags enrichment={enrichment} />}

      {/* Details */}
      <section className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="font-bold">{t("contactHeading")}</h2>
        {(w.street || w.address) && (
          <p className="text-sm">
            <span className="text-muted-foreground">{t("addressLabel")}</span>
            {w.street || w.address}
          </p>
        )}
        {(w.phone_intl || w.phone) && (
          <p className="text-sm">
            <span className="text-muted-foreground">{t("phoneLabel")}</span>
            <CallButton
              tel={telHref}
              display={w.phone_intl ?? w.phone ?? ""}
              placeId={w.place_id}
            />
          </p>
        )}
        {w.website && (
          <p className="text-sm">
            <span className="text-muted-foreground">{t("websiteLabel")}</span>
            <a
              href={w.website}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary"
            >
              {t("visitWebsite")}
            </a>
          </p>
        )}

        {/* WhatsApp CTA (mobile numbers only) */}
        {waDigits && <WhatsAppButton waDigits={waDigits} placeId={w.place_id} />}
      </section>

      {/* Available services */}
      {w.specialty_hints && w.specialty_hints.length > 0 && (
        <section className="mt-4 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-bold">{t("servicesHeading")}</h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {services.map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm">
                <Check size={16} className="shrink-0 text-primary" aria-hidden />
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Opening hours — 7-day table (today highlighted) + live open-now badge */}
      {w.opening_hours && (
        <section className="mt-4 rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-bold">{t("hoursHeading")}</h2>
            <OpenNowBadge openingHours={w.opening_hours} />
          </div>
          <HoursTable openingHours={w.opening_hours} />
        </section>
      )}

      {/* Map */}
      {w.lat != null && w.lng != null && (
        <section className="mt-4">
          <h2 className="mb-2 font-bold">{t("mapHeading")}</h2>
          {/* No-API-key embed (output=embed) — geographic pin only, no place photos */}
          <iframe
            src={`https://www.google.com/maps?q=${w.lat},${w.lng}&output=embed&hl=${locale}`}
            width="100%"
            height="400"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="rounded-2xl border border-border"
            title={t("mapTitle")}
          />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${w.lat},${w.lng}&query_place_id=${encodeURIComponent(w.place_id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            {t("openInGoogle")}
          </a>
        </section>
      )}

      {/* Reviews — visitor reviews (manually moderated) */}
      <section className="mt-4 rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-bold">{t("reviewsHeading")}</h2>
          {reviewSummary.count > 0 && reviewSummary.avg != null && (
            <span className="flex items-center gap-2 text-sm">
              <StarRating rating={reviewSummary.avg} />
              <span className="text-muted-foreground">({reviewSummary.count})</span>
            </span>
          )}
        </div>

        {reviewSummary.count > 0 ? (
          <ul className="flex flex-col gap-3">
            {reviewSummary.reviews.map((r) => (
              <li key={r.id} className="border-b border-border pb-3 last:border-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StarRating rating={r.rating} />
                  <span className="text-sm font-semibold">{r.author_name || t("visitor")}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatArabicDate(r.created_at.slice(0, 10))}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-foreground/85">{r.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noReviews")}</p>
        )}

        <div className="mt-5 border-t border-border pt-4">
          <ReviewForm placeId={w.place_id} />
        </div>
      </section>

      {/* Similar garages — internal linking (same area/specialty, rank-ordered) */}
      <SimilarWorkshops workshops={similar} />

      {/* Report this listing to Degself team via business WhatsApp */}
      <section className="mt-4 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 font-bold">{t("reportHeading")}</h2>
        <p className="mb-3 text-sm text-muted-foreground">{t("reportBody")}</p>
        <a
          href={`https://wa.me/${BUSINESS_WA}?text=${encodeURIComponent(
            `${t("reportWaText")}\n${w.name}\nhttps://degself.com/workshop/${w.place_id}\n\n${t("reportWaError")}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:opacity-90"
        >
          {t("reportButton")}
        </a>
      </section>
    </div>
  );
}
