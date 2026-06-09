import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkshop, getAllPlaceIds } from "@/lib/workshops";
import { BrandedCover } from "@/components/BrandedCover";
import { StarRating } from "@/components/StarRating";
import { WorkshopJsonLd } from "@/components/WorkshopJsonLd";
import { serviceModeLabel, reviewVolumeLabel } from "@/lib/labels";

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

      {/* Rating */}
      {w.google_rating != null && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <StarRating rating={w.google_rating} />
          {volume && <span className="text-muted-foreground">{volume}</span>}
        </div>
      )}

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
      </section>

      {/* Opening hours — raw text (Arabic free-text, no schema.org conversion) */}
      {w.opening_hours && (
        <section className="mt-4 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 font-bold">ساعات العمل</h2>
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            {w.opening_hours.split("|").map((line, i) => (
              <li key={i}>{line.trim()}</li>
            ))}
          </ul>
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
