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
import { serviceModeLabel, reviewVolumeLabel } from "@/lib/labels";
import { kuwaitWhatsAppDigits } from "@/lib/utils";

const WA_TEXT = "السلام عليكم، لقيتكم على دق سلف وحاب أستفسر عن الخدمة";

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

  const volume = reviewVolumeLabel(w.google_reviews_count);
  const location = [w.area, w.governorate].filter(Boolean).join(" · ");
  const telHref = (w.phone_intl || w.phone || "").replace(/[^\d+]/g, "");
  const waDigits = kuwaitWhatsAppDigits(w.phone_intl || w.phone); // mobile-only
  const services = [...new Set([w.specialty, ...(w.specialty_hints ?? [])])].filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <WorkshopJsonLd workshop={w} />

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

      {/* Rating + live open-now */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        {w.google_rating != null && (
          <span className="flex items-center gap-2">
            <StarRating rating={w.google_rating} />
            {volume && <span className="text-muted-foreground">{volume}</span>}
          </span>
        )}
        <OpenNowBadge openingHours={w.opening_hours} />
      </div>

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
            <a href={`tel:${telHref}`} className="font-semibold text-primary" dir="ltr">
              {w.phone_intl || w.phone}
            </a>
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

        {/* WhatsApp CTA */}
        {waDigits && (
          <a
            href={`https://wa.me/${waDigits}?text=${encodeURIComponent(WA_TEXT)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex w-fit items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-700"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
              <path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.9 11.9L4 20l4.2-1.1a7.9 7.9 0 0 0 3.8.97h.004a7.94 7.94 0 0 0 5.6-13.55zM12.05 18.5a6.56 6.56 0 0 1-3.34-.92l-.24-.14-2.49.65.66-2.43-.16-.25a6.59 6.59 0 1 1 5.57 3.09zm3.62-4.93c-.2-.1-1.17-.58-1.35-.64-.18-.07-.31-.1-.44.1-.13.2-.5.64-.62.77-.11.13-.23.15-.43.05a5.4 5.4 0 0 1-1.59-.98 6 6 0 0 1-1.1-1.37c-.11-.2-.01-.3.09-.4.09-.09.2-.23.3-.35.1-.12.13-.2.2-.34.07-.13.03-.25-.02-.35-.05-.1-.44-1.07-.6-1.46-.16-.38-.32-.33-.44-.34l-.37-.01a.72.72 0 0 0-.52.24c-.18.2-.68.67-.68 1.62 0 .96.7 1.88.8 2.01.1.13 1.38 2.1 3.34 2.95.47.2.83.32 1.11.41.47.15.9.13 1.23.08.38-.06 1.17-.48 1.33-.94.16-.46.16-.85.11-.94-.05-.08-.18-.13-.38-.23z" />
            </svg>
            تواصل واتساب
          </a>
        )}
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
            href={`https://www.google.com/maps/place/?q=place_id:${w.place_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            افتح في خرائط Google
          </a>
        </section>
      )}

      {/* Reviews — Phase 2 placeholder */}
      <section className="mt-4 rounded-xl border border-dashed border-border p-6 text-center">
        <h2 className="font-bold">التقييمات</h2>
        <p className="mt-1 text-sm text-muted-foreground">قريباً — تقييمات المستخدمين</p>
      </section>
    </div>
  );
}
