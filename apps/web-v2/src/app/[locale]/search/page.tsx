import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DEFAULT_LOCALE } from "@/i18n/routing";
import {
  searchWorkshops,
  getDistinctAreas,
  getDistinctNeighborhoods,
  getDistinctSpecialties,
} from "@/lib/workshops";
import { WorkshopCard } from "@/components/WorkshopCard";
import { SearchFilters } from "@/components/SearchFilters";
import { SearchTracker } from "@/components/SearchTracker";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { inferSpecialtyFromQuery } from "@/lib/dialect";

export const dynamic = "force-dynamic"; // results depend on the query — never cached

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "search" });
  const url =
    locale === DEFAULT_LOCALE
      ? "https://degself.com/search"
      : `https://degself.com/${locale}/search`;
  // Any query params → filtered variant. Canonicalize to /search and mark
  // noindex to prevent duplicate-content bloat from every filter combo.
  const hasParams = Object.values(sp).some((v) => v !== undefined && v !== "");

  const base = {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: url },
    openGraph: {
      title: t("metaTitle"),
      description: t("ogDescription"),
      url,
      type: "website" as const,
      siteName: "دق سلف",
      images: ["/og-image.jpg?v=2"],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: t("metaTitle"),
      description: t("twDescription"),
      images: ["/og-image.jpg?v=2"],
    },
  };

  return hasParams
    ? { ...base, robots: { index: false, follow: true } }
    : base;
}

// Twelve cards keep the initial HTML/RSC payload practical on mobile while the
// existing pagination preserves access to every result.
const PAGE_SIZE = 12;
const GOVERNORATES = [
  "العاصمة",
  "حولي",
  "الفروانية",
  "مبارك الكبير",
  "الجهراء",
  "الأحمدي",
];

type SP = Record<string, string | undefined>;

// empty-state pills: Arabic specialty value drives the search query (DB value),
// the label is translated for display
const EMPTY_PILLS = [
  { value: "ميكانيكا", key: "mechanics" },
  { value: "تواير", key: "tires" },
  { value: "تكييف", key: "ac" },
  { value: "بودي وصبغ", key: "bodywork" },
  { value: "بطاريات", key: "batteries" },
  { value: "زيوت وصيانة", key: "oils" },
] as const;

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SP>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // comma-separated multi-select facets → arrays
  const csv = (v?: string) =>
    (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  // Dialect intent: when the colloquial query maps to a specialty, search by that
  // specialty (intent) rather than literal keywords — unless the user opted out
  // (?exact=1) or already picked an explicit specialty.
  const optedOut = sp.exact === "1";
  const dialect =
    !optedOut && !sp.specialty ? inferSpecialtyFromQuery(sp.q) : null;
  const effectiveSpecialty = sp.specialty ?? dialect?.specialty;
  const effectiveQuery = dialect ? undefined : sp.q;

  const [{ workshops, total }, areas, neighborhoods, specialties] =
    await Promise.all([
      searchWorkshops({
        query: effectiveQuery,
        area: sp.area,
        neighborhood: sp.neighborhood,
        governorate: sp.governorate,
        specialty: effectiveSpecialty,
        service_mode: sp.service_mode,
        sort: sp.sort,
        lat: sp.lat ? Number(sp.lat) : undefined,
        lng: sp.lng ? Number(sp.lng) : undefined,
        open_now: sp.open_now === "1",
        min_rating: sp.min_rating ? Number(sp.min_rating) : undefined,
        trust: csv(sp.trust),
        positive: csv(sp.pos),
        negative: csv(sp.neg),
        score_min: sp.score ? Number(sp.score) : undefined,
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
    if (sp.trust) params.set("trust", sp.trust);
    if (sp.pos) params.set("pos", sp.pos);
    if (sp.neg) params.set("neg", sp.neg);
    if (sp.score) params.set("score", sp.score);
    if (sp.exact) params.set("exact", sp.exact);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/search?${qs}` : "/search";
  }

  // "search literally" link — same query, dialect understanding disabled.
  function exactHref() {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.area) params.set("area", sp.area);
    if (sp.neighborhood) params.set("neighborhood", sp.neighborhood);
    if (sp.governorate) params.set("governorate", sp.governorate);
    if (sp.service_mode) params.set("service_mode", sp.service_mode);
    if (sp.sort) params.set("sort", sp.sort);
    if (sp.open_now) params.set("open_now", sp.open_now);
    if (sp.min_rating) params.set("min_rating", sp.min_rating);
    if (sp.trust) params.set("trust", sp.trust);
    if (sp.pos) params.set("pos", sp.pos);
    if (sp.neg) params.set("neg", sp.neg);
    if (sp.score) params.set("score", sp.score);
    params.set("exact", "1");
    return `/search?${params.toString()}`;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <BreadcrumbJsonLd
        items={[
          { name: t("breadcrumbHome"), url: "https://degself.com/" },
          { name: t("breadcrumbSearch"), url: "https://degself.com/search" },
        ]}
      />
      <SearchTracker query={sp.q ?? ""} />
      <h1 className="mb-4 text-2xl font-extrabold">{t("heading")}</h1>

      <SearchFilters
        areas={areas}
        governorates={GOVERNORATES}
        specialties={specialties}
        neighborhoods={neighborhoods}
      />

      {/* Dialect intent banner — shown when a colloquial query was understood */}
      {dialect && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm">
          <span>
            {t("dialectUnderstood")}{" "}
            <span className="font-bold text-primary">{dialect.specialty}</span>
          </span>
          <Link
            href={exactHref()}
            className="font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {t("dialectExact")}
          </Link>
        </div>
      )}

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
              <p className="text-lg font-bold">{t("noResultsTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("noResultsHint")}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {EMPTY_PILLS.map((s) => (
                <Link key={s.value} href={`/search?specialty=${encodeURIComponent(s.value)}`} className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:border-primary/60 hover:bg-primary/10 hover:text-primary">
                  {t(`pills.${s.key}`)}
                </Link>
              ))}
            </div>
            <Link href="/search" className="text-sm font-semibold text-primary hover:underline">
              {t("resetFilters")}
            </Link>
            <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-5 text-center">
              <p className="mb-2 text-sm font-bold">{t("knowMissingTitle")}</p>
              <Link href="/report-workshop" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90">
                {t("reportCta")}
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {workshops.map((w) => (
              <WorkshopCard
                key={w.place_id}
                workshop={w}
                distanceKm={w.distance_km}
                enrichment={w.enrichment}
              />
            ))}
          </div>
        )}
      </div>

      {/* Report missing workshop banner */}
      {workshops.length > 0 && (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center sm:flex-row sm:justify-between sm:text-right">
          <div>
            <p className="text-sm font-bold">{t("missingTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("missingSubtitle")}</p>
          </div>
          <Link href="/report-workshop" className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90">
            {t("reportMissingCta")}
          </Link>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-4">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              {t("prev")}
            </Link>
          ) : (
            <span className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground/40">
              {t("prev")}
            </span>
          )}

          <span className="text-sm text-muted-foreground">
            {t("pageOf", { page, total: totalPages })}
          </span>

          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              {t("next")}
            </Link>
          ) : (
            <span className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground/40">
              {t("next")}
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
