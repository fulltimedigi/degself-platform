import Link from "next/link";
import {
  searchWorkshops,
  getDistinctAreas,
  getDistinctNeighborhoods,
  getDistinctSpecialties,
} from "@/lib/workshops";
import { WorkshopCard } from "@/components/WorkshopCard";
import { SearchFilters } from "@/components/SearchFilters";
import { SearchTracker } from "@/components/SearchTracker";

export const dynamic = "force-dynamic"; // results depend on the query — never cached

export const metadata = {
  title: "البحث عن كراج في الكويت | دق سلف",
  description:
    "ابحث في 1,757 كراج موثّق بالكويت. صفِّ بالتخصص (ميكانيكا، تواير، بودي وصبغ، تكييف) والمنطقة والمحافظة.",
  alternates: { canonical: "https://degself.com/search" },
  openGraph: {
    title: "البحث عن كراج في الكويت | دق سلف",
    description:
      "ابحث في 1,757 كراج موثّق بالكويت. صفِّ بالتخصص والمنطقة والمحافظة.",
    url: "https://degself.com/search",
    type: "website",
    locale: "ar_KW",
    siteName: "دق سلف",
    images: ["/og-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "البحث عن كراج في الكويت | دق سلف",
    description: "ابحث في 1,757 كراج موثّق بالكويت.",
    images: ["/og-image.jpg"],
  },
};

const PAGE_SIZE = 24;
const GOVERNORATES = [
  "العاصمة",
  "حولي",
  "الفروانية",
  "مبارك الكبير",
  "الجهراء",
  "الأحمدي",
];

type SP = Record<string, string | undefined>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [{ workshops, total }, areas, neighborhoods, specialties] =
    await Promise.all([
      searchWorkshops({
        query: sp.q,
        area: sp.area,
        neighborhood: sp.neighborhood,
        governorate: sp.governorate,
        specialty: sp.specialty,
        service_mode: sp.service_mode,
        sort: sp.sort,
        lat: sp.lat ? Number(sp.lat) : undefined,
        lng: sp.lng ? Number(sp.lng) : undefined,
        open_now: sp.open_now === "1",
        min_rating: sp.min_rating ? Number(sp.min_rating) : undefined,
        limit: PAGE_SIZE,
        offset,
      }),
      getDistinctAreas(),
      getDistinctNeighborhoods(),
      getDistinctSpecialties(),
    ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Build a ?page=N URL that preserves the current filters.
  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.area) params.set("area", sp.area);
    if (sp.neighborhood) params.set("neighborhood", sp.neighborhood);
    if (sp.governorate) params.set("governorate", sp.governorate);
    if (sp.specialty) params.set("specialty", sp.specialty);
    if (sp.service_mode) params.set("service_mode", sp.service_mode);
    if (sp.sort) params.set("sort", sp.sort);
    if (sp.lat) params.set("lat", sp.lat);
    if (sp.lng) params.set("lng", sp.lng);
    if (sp.open_now) params.set("open_now", sp.open_now);
    if (sp.min_rating) params.set("min_rating", sp.min_rating);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/search?${qs}` : "/search";
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <SearchTracker query={sp.q ?? ""} />
      <h1 className="mb-4 text-2xl font-extrabold">نتائج البحث</h1>

      <SearchFilters
        areas={areas}
        governorates={GOVERNORATES}
        specialties={specialties}
        neighborhoods={neighborhoods}
      />

      <div className="mt-8">
        {workshops.length === 0 ? (
          <div className="flex flex-col items-center gap-6 py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground" aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-lg font-bold">ما لقينا نتائج تطابق بحثك</p>
              <p className="text-sm text-muted-foreground">جرّب كلمات أبسط أو ابحث بأشهر التخصصات:</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {["ميكانيكا","تواير","تكييف","بودي وصبغ","بطاريات","زيوت وصيانة"].map((s) => (
                <Link key={s} href={`/search?specialty=${encodeURIComponent(s)}`} className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:border-primary/60 hover:bg-primary/10 hover:text-primary">
                  {s}
                </Link>
              ))}
            </div>
            <Link href="/search" className="text-sm font-semibold text-primary hover:underline">
              إعادة تعيين الفلاتر وعرض الكل ←
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {workshops.map((w) => (
              <WorkshopCard key={w.place_id} workshop={w} distanceKm={w.distance_km} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-4" dir="rtl">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              السابق
            </Link>
          ) : (
            <span className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground/40">
              السابق
            </span>
          )}

          <span className="text-sm text-muted-foreground">
            صفحة {page} من {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              التالي
            </Link>
          ) : (
            <span className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground/40">
              التالي
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
