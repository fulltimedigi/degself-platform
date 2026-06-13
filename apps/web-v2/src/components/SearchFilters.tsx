"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SERVICE_MODES = [
  { value: "fixed", label: "كراج" },
  { value: "mobile", label: "كراج متنقل" },
  { value: "tow", label: "سطحة" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "الأنسب" },
  { value: "top-rated", label: "الأعلى تقييماً" },
  { value: "most-reviews", label: "الأكثر مراجعات" },
  { value: "az", label: "أبجدي (أ-ي)" },
];

interface SearchFiltersProps {
  areas: string[];
  governorates: string[];
  specialties: string[];
  neighborhoods: string[];
}

export function SearchFilters({
  areas,
  governorates,
  specialties,
  neighborhoods,
}: SearchFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // local state for the debounced text inputs
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [nbhd, setNbhd] = useState(searchParams.get("neighborhood") ?? "");
  const [rating, setRating] = useState(Number(searchParams.get("min_rating") ?? 0));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nbhdDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortValue = searchParams.get("sort") ?? "relevance";

  // Build a new URL with one param changed (empty value removes it), reset paging.
  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page"); // any filter change → back to first page
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // debounce the text query (300ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (query !== (searchParams.get("q") ?? "")) updateParam("q", query.trim());
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchParams, updateParam]);

  // debounce the neighborhood (الحي) datalist input (300ms)
  useEffect(() => {
    if (nbhdDebounceRef.current) clearTimeout(nbhdDebounceRef.current);
    nbhdDebounceRef.current = setTimeout(() => {
      if (nbhd !== (searchParams.get("neighborhood") ?? ""))
        updateParam("neighborhood", nbhd.trim());
    }, 300);
    return () => {
      if (nbhdDebounceRef.current) clearTimeout(nbhdDebounceRef.current);
    };
  }, [nbhd, searchParams, updateParam]);

  const activeMode = searchParams.get("service_mode") ?? "";
  const hasFilters =
    !!searchParams.get("q") ||
    !!searchParams.get("area") ||
    !!searchParams.get("neighborhood") ||
    !!searchParams.get("specialty") ||
    !!searchParams.get("governorate") ||
    !!searchParams.get("service_mode") ||
    !!searchParams.get("min_rating") ||
    !!searchParams.get("sort");

  function clearAll() {
    setQuery("");
    setNbhd("");
    setRating(0);
    router.push(pathname, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3" dir="rtl">
      {/* text search */}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث عن كراج، منطقة، أو خدمة..."
        autoComplete="off"
        className="w-full rounded-xl border border-border bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />

      <div className="flex flex-wrap gap-3">
        {/* governorate */}
        <select
          value={searchParams.get("governorate") ?? ""}
          onChange={(e) => updateParam("governorate", e.target.value)}
          className="rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">كل المحافظات</option>
          {governorates.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        {/* area */}
        <select
          value={searchParams.get("area") ?? ""}
          onChange={(e) => updateParam("area", e.target.value)}
          className="rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">كل المناطق</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        {/* neighborhood (الحي) — 500+ values → datalist autocomplete */}
        <input
          type="search"
          list="neighborhoods"
          value={nbhd}
          onChange={(e) => setNbhd(e.target.value)}
          placeholder="الحي"
          autoComplete="off"
          className="rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <datalist id="neighborhoods">
          {neighborhoods.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>

        {/* specialty (التخصص) — from the audited reviewed_specialty */}
        <select
          value={searchParams.get("specialty") ?? ""}
          onChange={(e) => updateParam("specialty", e.target.value)}
          className="rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">كل التخصصات</option>
          {specialties.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* sort */}
        <select
          value={sortValue}
          onChange={(e) =>
            updateParam("sort", e.target.value === "relevance" ? "" : e.target.value)
          }
          className="rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* min-rating slider */}
      <div className="flex items-center gap-3">
        <label className="whitespace-nowrap text-sm text-muted-foreground">
          التقييم الأدنى: {rating > 0 ? `${rating}+ ★` : "الكل"}
        </label>
        <input
          type="range"
          min={0}
          max={5}
          step={1}
          value={rating}
          onChange={(e) => {
            const v = Number(e.target.value);
            setRating(v);
            updateParam("min_rating", v ? String(v) : "");
          }}
          className="flex-1 accent-primary"
          aria-label="التقييم الأدنى"
        />
      </div>

      {/* service mode buttons */}
      <div className="flex flex-wrap gap-2">
        {SERVICE_MODES.map((m) => {
          const on = activeMode === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => updateParam("service_mode", on ? "" : m.value)}
              className={
                "rounded-xl border px-4 py-2 text-sm font-semibold transition " +
                (on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground hover:bg-muted")
              }
            >
              {m.label}
            </button>
          );
        })}

        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            مسح الفلاتر
          </button>
        )}
      </div>
    </div>
  );
}
