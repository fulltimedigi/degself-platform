import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { getWorkshop, getAllPlaceIds } from "@/lib/workshops";
import { BrandedCover } from "@/components/BrandedCover";
import { StarRating } from "@/components/StarRating";
import { OpenNowBadge } from "@/components/OpenNowBadge";
import { HoursTable } from "@/components/HoursTable";
import { WorkshopJsonLd } from "@/components/WorkshopJsonLd";
import { JsonLd } from "@/components/JsonLd";
import { CallButton } from "@/components/CallButton";

const SITE = "https://degself.com";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { SaveButton } from "@/components/SaveButton";
import { ReviewForm } from "@/components/ReviewForm";
import { getApprovedReviews } from "@/lib/reviews";
import { serviceModeLabel, reviewVolumeLabel } from "@/lib/labels";
import { kuwaitWhatsAppDigits, formatArabicDate } from "@/lib/utils";
import { BUSINESS_WA } from "@/lib/constants";
import { getEnrichment } from "@/lib/enrichment";
import {
  TrustBanner,
  SmartScore,
  EnrichmentSummary,
  EnrichmentTags,
} from "@/components/ReviewInsights";

export const revalidate = 3600; // ISR
export const dynamicParams = true; // place_ids beyond the pre-rendered 100 build on demand

// Pre-render the 100 most-reviewed workshops at build time; the rest are ISR.
export async function generateStaticParams() {
  const ids = await getAllPlaceIds(100);
  return ids.map((place_id) => ({ place_id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ place_id: string }>;
}): Promise<Metadata> {
  const { place_id } = await params;
  const w = await getWorkshop(place_id);
  if (!w) return { title: "غير موجود — degself" };
  const loc = w.area ? ` · ${w.area}` : "";
  return {
    title: `${w.name} — degself`,
    description: `${w.specialty}${loc} — على دق سلف`,
    // place_id is case-sensitive — emit it verbatim, never lowercased.
    alternates: { canonical: `${SITE}/workshop/${place_id}` },
  };
}

export default async function WorkshopPage({
  params,
}: {
  params: Promise<{ place_id: string }>;
}) {
  const { place_id } = await params; // verbatim — case-sensitive, never transform
  const w = await getWorkshop(place_id);
  if (!w) notFound();

  const reviewSummary = await getApprovedReviews(place_id);
  const enrichment = getEnrichment(place_id);

  const volume = reviewVolumeLabel(w.google_reviews_count);
  const location = [w.area, w.governorate].filter(Boolean).join(" · ");
  const telHref = (w.phone_intl || w.phone || "").replace(/[^\d+]/g, "");
  const waDigits = kuwaitWhatsAppDigits(w.phone_intl || w.phone); // mobile-only
  const services = [...new Set([w.specialty, ...(w.specialty_hints ?? [])])].filter(Boolean);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE },
      { "@type": "ListItem", position: 2, name: "الكراجات", item: `${SITE}/search` },
      {
        "@type": "ListItem",
        position: 3,
        name: w.name,
        item: `${SITE}/workshop/${place_id}`,
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <WorkshopJsonLd workshop={w} reviews={reviewSummary} />
      <JsonLd data={breadcrumbLd} />

      <Link href="/search" className="text-sm text-muted-foreground hover:text-foreground">
        ← رجوع للبحث
      </Link>

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
          {serviceModeLabel(w.service_mode)}
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
            {volume && <span className="text-muted-foreground">{volume}</span>}
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
        <h2 className="font-bold">معلومات التواصل</h2>
        {(w.street || w.address) && (
          <p className="text-sm">
            <span className="text-muted-foreground">العنوان: </span>
            {w.street || w.address}
          </p>
        )}
        {(w.phone_intl || w.phone) && (
          <p className="text-sm">
            <span className="text-muted-foreground">الهاتف: </span>
            <CallButton
              tel={telHref}
              display={w.phone_intl ?? w.phone ?? ""}
              placeId={w.place_id}
            />
          </p>
        )}
        {w.website && (
          <p className="text-sm">
            <span className="text-muted-foreground">الموقع: </span>
            <a
              href={w.website}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary"
            >
              زيارة الموقع
            </a>
          </p>
        )}

        {/* WhatsApp CTA (mobile numbers only) */}
        {waDigits && <WhatsAppButton waDigits={waDigits} placeId={w.place_id} />}
      </section>

      {/* Available services */}
      {w.specialty_hints && w.specialty_hints.length > 0 && (
        <section className="mt-4 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-bold">خدمات متوفّرة</h2>
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
            <h2 className="font-bold">ساعات العمل</h2>
            <OpenNowBadge openingHours={w.opening_hours} />
          </div>
          <HoursTable openingHours={w.opening_hours} />
        </section>
      )}

      {/* Map */}
      {w.lat != null && w.lng != null && (
        <section className="mt-4">
          <h2 className="mb-2 font-bold">الموقع على الخريطة</h2>
          {/* No-API-key embed (output=embed) — geographic pin only, no place photos */}
          <iframe
            src={`https://www.google.com/maps?q=${w.lat},${w.lng}&output=embed&hl=ar`}
            width="100%"
            height="400"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="rounded-2xl border border-border"
            title="موقع المنشأة على الخريطة"
          />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${w.lat},${w.lng}&query_place_id=${encodeURIComponent(w.place_id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            افتح في خرائط Google
          </a>
        </section>
      )}

      {/* Reviews — visitor reviews (manually moderated) */}
      <section className="mt-4 rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-bold">التقييمات</h2>
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
                  <span className="text-sm font-semibold">{r.author_name || "زائر"}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatArabicDate(r.created_at.slice(0, 10))}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-foreground/85">{r.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            لا توجد تقييمات بعد — كن أول من يقيّم هذا الكراج.
          </p>
        )}

        <div className="mt-5 border-t border-border pt-4">
          <ReviewForm placeId={w.place_id} />
        </div>
      </section>

      {/* Report this listing to Degself team via business WhatsApp */}
      <section className="mt-4 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 font-bold">بلّغنا</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          إذا لاحظت أي خطأ في بيانات هذا الكراج (رقم، عنوان، ساعات عمل، أو خدمات)، أبلغنا عبر واتساب لنصحّحه خلال ساعات.
        </p>
        <a
          href={`https://wa.me/${BUSINESS_WA}?text=${encodeURIComponent(
            `السلام عليكم، أرغب بالتبليغ عن خطأ في بيانات كراج:\n${w.name}\nhttps://degself.com/workshop/${w.place_id}\n\nالخطأ: `
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:opacity-90"
        >
          بلّغنا عبر واتساب
        </a>
      </section>
    </div>
  );
}
