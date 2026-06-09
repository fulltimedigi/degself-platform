import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, SlidersHorizontal, X, Clock } from "lucide-react";
import { Layout } from "@/components/Layout";
import { WorkshopCard, WorkshopCardSkeleton } from "@/components/WorkshopCard";
import { EmptyState, ErrorState } from "@/components/States";
import { fetchWorkshops, fetchSpecialties, fetchEntityTypes, fetchGovernorates } from "@/lib/api";
import type { WorkshopsResponse, CountItem, GovernorateItem } from "@/lib/types";
import { useHashQuery, paramList } from "@/lib/useHashQuery";
import { ENTITY_TYPES } from "@/lib/brand";

const PAGE_SIZE = 24;

export default function SearchPage() {
  const { params, setParams } = useHashQuery();

  const govSel = paramList(params, "governorate");
  const specSel = paramList(params, "specialty");
  const typeSel = paramList(params, "entity_type");
  const minRating = params.get("min_rating") ? parseFloat(params.get("min_rating")!) : 0;
  const openNow = params.get("open_now") === "true";
  const sort = params.get("sort") || "rating";
  const qParam = params.get("q") || "";

  const [qInput, setQInput] = useState(qParam);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // keep input in sync if URL changes externally
  useEffect(() => setQInput(qParam), [qParam]);
  // reset paging when filters change
  useEffect(() => setLimit(PAGE_SIZE), [params.toString()]);

  // debounce q -> URL
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const onQChange = (val: string) => {
    setQInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (val.trim()) next.set("q", val.trim());
      else next.delete("q");
      setParams(next, true);
    }, 300);
  };

  const update = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params);
    mutate(next);
    setParams(next, true);
  };

  const toggleMulti = (key: string, val: string) => {
    const cur = paramList(params, key);
    const set = new Set(cur);
    if (set.has(val)) set.delete(val);
    else set.add(val);
    update((p) => {
      if (set.size) p.set(key, Array.from(set).join(","));
      else p.delete(key);
    });
  };

  const clearAll = () =>
    update((p) => {
      ["governorate", "specialty", "entity_type", "min_rating", "open_now"].forEach((k) => p.delete(k));
    });

  const specialties = useQuery<CountItem[]>({ queryKey: ["/api/specialties"], queryFn: fetchSpecialties });
  const entityTypes = useQuery<CountItem[]>({ queryKey: ["/api/entity-types"], queryFn: fetchEntityTypes });
  const govs = useQuery<GovernorateItem[]>({ queryKey: ["/api/governorates"], queryFn: fetchGovernorates });

  const filters = useMemo(
    () => ({
      q: qParam,
      governorate: govSel,
      specialty: specSel,
      entity_type: typeSel,
      min_rating: minRating,
      open_now: openNow,
      sort,
      limit,
      offset: 0,
    }),
    [qParam, govSel.join(), specSel.join(), typeSel.join(), minRating, openNow, sort, limit]
  );

  const results = useQuery<WorkshopsResponse>({
    queryKey: ["/api/workshops", "search", JSON.stringify(filters)],
    queryFn: () => fetchWorkshops(filters),
  });

  const activeCount =
    govSel.length + specSel.length + typeSel.length + (minRating > 0 ? 1 : 0) + (openNow ? 1 : 0);

  const Sidebar = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <SlidersHorizontal size={18} /> التصفية
        </h2>
        {activeCount > 0 && (
          <button onClick={clearAll} className="text-xs font-semibold text-primary hover:underline" data-testid="button-clear-filters">
            مسح ({activeCount})
          </button>
        )}
      </div>

      {/* Open now */}
      <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card p-3" data-testid="toggle-open-now">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Clock size={16} className="text-primary" /> مفتوح الآن
        </span>
        <input
          type="checkbox"
          checked={openNow}
          onChange={(e) => update((p) => (e.target.checked ? p.set("open_now", "true") : p.delete("open_now")))}
          className="h-5 w-5 accent-[#FFD60A]"
        />
      </label>

      {/* Min rating */}
      <div>
        <div className="mb-2 flex items-center justify-between text-sm font-semibold">
          <span>الحد الأدنى للتقييم</span>
          <span className="font-en text-primary">{minRating > 0 ? minRating.toFixed(1) : "الكل"}</span>
        </div>
        <input
          type="range"
          min={0}
          max={5}
          step={0.5}
          value={minRating}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            update((p) => (v > 0 ? p.set("min_rating", String(v)) : p.delete("min_rating")));
          }}
          className="w-full accent-[#FFD60A]"
          data-testid="slider-min-rating"
        />
      </div>

      {/* Governorate */}
      <FilterGroup title="المحافظة">
        {(govs.data || []).map((g) => (
          <CheckRow
            key={g.name}
            label={g.name}
            count={g.count}
            checked={govSel.includes(g.name)}
            onChange={() => toggleMulti("governorate", g.name)}
            testid={`filter-gov-${g.name}`}
          />
        ))}
      </FilterGroup>

      {/* Entity type */}
      <FilterGroup title="نوع المنشأة">
        {ENTITY_TYPES.map((t) => {
          const c = entityTypes.data?.find((x) => x.name === t)?.count;
          return (
            <CheckRow
              key={t}
              label={t}
              count={c}
              checked={typeSel.includes(t)}
              onChange={() => toggleMulti("entity_type", t)}
              testid={`filter-type-${t}`}
            />
          );
        })}
      </FilterGroup>

      {/* Specialty */}
      <FilterGroup title="التخصّص" scroll>
        {(specialties.data || []).map((s) => (
          <CheckRow
            key={s.name}
            label={s.name}
            count={s.count}
            checked={specSel.includes(s.name)}
            onChange={() => toggleMulti("specialty", s.name)}
            testid={`filter-spec-${s.name}`}
          />
        ))}
      </FilterGroup>
    </div>
  );

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {/* Search + sort bar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-input px-3 py-2 focus-within:border-primary">
            <SearchIcon size={18} className="text-muted-foreground" />
            <input
              value={qInput}
              onChange={(e) => onQChange(e.target.value)}
              placeholder="ابحث عن كراج، مركز، تخصص، أو منطقة..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              data-testid="input-search"
            />
            {qInput && (
              <button onClick={() => onQChange("")} aria-label="مسح" data-testid="button-clear-search">
                <X size={16} className="text-muted-foreground" />
              </button>
            )}
          </div>

          <button
            onClick={() => setMobileFilters(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover-elevate lg:hidden"
            data-testid="button-open-filters"
          >
            <SlidersHorizontal size={16} /> تصفية {activeCount > 0 && `(${activeCount})`}
          </button>

          <select
            value={sort}
            onChange={(e) => update((p) => p.set("sort", e.target.value))}
            className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold outline-none hover-elevate"
            data-testid="select-sort"
          >
            <option value="rating">الأعلى تقييماً</option>
            <option value="reviews">الأكثر مراجعات</option>
            <option value="name">الاسم (أ-ي)</option>
          </select>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-card-border bg-card p-4">
              {Sidebar}
            </div>
          </aside>

          {/* Results */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground" data-testid="text-result-count">
                {results.isLoading
                  ? "جارٍ التحميل…"
                  : `${(results.data?.total ?? 0).toLocaleString("en-US")} نتيجة`}
              </p>
            </div>

            {results.isError ? (
              <ErrorState onRetry={() => results.refetch()} />
            ) : results.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <WorkshopCardSkeleton key={i} />
                ))}
              </div>
            ) : (results.data?.results.length ?? 0) === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {results.data!.results.map((w) => (
                    <WorkshopCard key={w.place_id} w={w} />
                  ))}
                </div>
                {results.data!.total > results.data!.results.length && (
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={() => setLimit((l) => l + PAGE_SIZE)}
                      className="rounded-xl border border-border bg-card px-6 py-2.5 text-sm font-bold hover-elevate active-elevate-2"
                      data-testid="button-load-more"
                    >
                      تحميل المزيد
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filters drawer */}
      {mobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden" data-testid="drawer-filters">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileFilters(false)} />
          <div className="absolute inset-y-0 right-0 w-[85%] max-w-sm overflow-y-auto bg-background p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">التصفية</h2>
              <button onClick={() => setMobileFilters(false)} aria-label="إغلاق" data-testid="button-close-filters">
                <X size={22} />
              </button>
            </div>
            {Sidebar}
            <button
              onClick={() => setMobileFilters(false)}
              className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover-elevate active-elevate-2"
              data-testid="button-apply-filters"
            >
              عرض النتائج
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}

function FilterGroup({ title, children, scroll }: { title: string; children: React.ReactNode; scroll?: boolean }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold">{title}</h3>
      <div className={`space-y-1 ${scroll ? "max-h-64 overflow-y-auto pl-1" : ""}`}>{children}</div>
    </div>
  );
}

function CheckRow({
  label,
  count,
  checked,
  onChange,
  testid,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
  testid?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-md px-1.5 py-1.5 text-sm hover-elevate" data-testid={testid}>
      <span className="flex items-center gap-2">
        <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-[#FFD60A]" />
        <span className={checked ? "font-semibold text-primary" : ""}>{label}</span>
      </span>
      {count != null && <span className="font-en text-xs text-muted-foreground">{count}</span>}
    </label>
  );
}
