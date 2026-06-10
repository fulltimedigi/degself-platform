import Link from "next/link";
import { searchWorkshops, getDistinctAreas } from "@/lib/workshops";
import { WorkshopCard } from "@/components/WorkshopCard";
import { SearchFilters } from "@/components/SearchFilters";
import { SearchTracker } from "@/components/SearchTracker";

export const dynamic = "force-dynamic"; // results depend on the query — never cached

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

  const [{ workshops, total }, areas] = await Promise.all([
    searchWorkshops({
      query: sp.q,
      area: sp.area,
      governorate: sp.governorate,
      specialty: sp.specialty,
      service_mode: sp.service_mode,
      sort: sp.sort,
      min_rating: sp.min_rating ? Number(sp.min_rating) : undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    getDistinctAreas(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Build a ?page=N URL that preserves the current filters.
  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.area) params.set("area", sp.area);
    if (sp.governorate) params.set("governorate", sp.governorate);
    if (sp.specialty) params.set("specialty", sp.specialty);
    if (sp.service_mode) params.set("service_mode", sp.service_mode);
    if (sp.sort) params.set("sort", sp.sort);
    if (sp.min_rating) params.set("min_rating", sp.min_rating);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/search?${qs}` : "/search";
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <SearchTracker query={sp.q ?? ""} />
      <h1 className="mb-4 text-2xl font-extrabold">نتائج البحث</h1>

      <SearchFilters areas={areas} governorates={GOVERNORATES} />

      <div className="mt-8">
        {workshops.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            ما لقينا نتائج تطابق بحثك. جرّب كلمات أو فلاتر مختلفة.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {workshops.map((w) => (
              <WorkshopCard key={w.place_id} workshop={w} />
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
