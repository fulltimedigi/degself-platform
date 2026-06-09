"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SERVICE_MODES = [
  { value: "fixed", label: "كراج" },
  { value: "mobile", label: "كراج متنقل" },
  { value: "tow", label: "سطحة" },
];

interface SearchFiltersProps {
  areas: string[];
  governorates: string[];
}

export function SearchFilters({ areas, governorates }: SearchFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // local state for the debounced text input
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const activeMode = searchParams.get("service_mode") ?? "";
  const hasFilters =
    !!searchParams.get("q") ||
    !!searchParams.get("area") ||
    !!searchParams.get("governorate") ||
    !!searchParams.get("service_mode");

  function clearAll() {
    setQuery("");
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
