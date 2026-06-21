"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import filterOptions from "@/data/filter_options.json";

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

// Review-analysis facets (degself enrichment). Counts come straight from the
// generated filter_options.json so the UI stays in sync with the data.
const TRUST_OPTS = filterOptions.trust_signals; // {value,label,count,icon}
const POSITIVE_OPTS = filterOptions.positive_filters.slice(0, 8); // top 8 — keep UI light
const NEGATIVE_OPTS = filterOptions.negative_filters.slice(0, 6); // {tag,count}
const SCORE_OPTS = [
  { value: "", label: "الكل" },
  { value: "85", label: "ممتاز (85+)" },
  { value: "70", label: "جيد جداً (70+)" },
  { value: "55", label: "مقبول (55+)" },
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
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nbhdDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortValue = searchParams.get("sort") ?? "relevance";
  const nearActive = sortValue === "distance";
  const openNowActive = searchParams.get("open_now") === "1";

  // "near me": ask the browser for the user's location, then sort by distance.
  function nearMe() {
    if (!("geolocation" in navigator)) {
      setGeoErr("المتصفح لا يدعم تحديد الموقع");
      return;
    }
    setLocating(true);
    setGeoErr("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const params = new URLSearchParams(searchParams.toString());
        params.set("sort", "distance");
        params.set("lat", pos.coords.latitude.toFixed(5));
        params.set("lng", pos.coords.longitude.toFixed(5));
        params.delete("page");
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      },
      () => {
        setLocating(false);
        setGeoErr("تعذّر تحديد موقعك — فعّل إذن الموقع وحاول مرة أخرى");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  // Changing sort away from "distance" drops the stored location too.
  function onSortChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "relevance") params.delete("sort");
    else params.set("sort", value);
    if (value !== "distance") {
      params.delete("lat");
      params.delete("lng");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

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

  // Comma-separated multi-select facets (trust / positive / negative).
  const csv = (key: string) =>
    (searchParams.get(key) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const isOn = (key: string, value: string) => csv(key).includes(value);
  const toggleMulti = useCallback(
    (key: string, value: string) => {
      const cur = (searchParams.get(key) ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const next = cur.includes(value)
        ? cur.filter((v) => v !== value)
        : [...cur, value];
      const params = new URLSearchParams(searchParams.toString());
      if (next.length) params.set(key, next.join(","));
      else params.delete(key);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Advanced (review-analysis) facets — collapsed by default so results stay
  // visible; opens as an inline accordion on desktop and a bottom drawer on
  // mobile. Sticky-open on load when any of its filters is already active.
  const scoreValue = searchParams.get("score") ?? "";
  const insightsCount =
    csv("trust").length +
    csv("pos").length +
    csv("neg").length +
    (scoreValue ? 1 : 0);
  const [advancedOpen, setAdvancedOpen] = useState(insightsCount > 0);

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
    !!searchParams.get("sort") ||
    !!searchParams.get("lat") ||
    !!searchParams.get("open_now") ||
    !!searchParams.get("trust") ||
    !!searchParams.get("pos") ||
    !!searchParams.get("neg") ||
    !!searchParams.get("score");

  function clearAll() {
    setQuery("");
    setNbhd("");
    router.push(pathname, { scroll: false });
  }

  // Explicit search (button click or Enter) — flush the debounce and apply now.
  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim() !== (searchParams.get("q") ?? "")) updateParam("q", query.trim());
  }

  // The four review-analysis groups — rendered inside both the desktop accordion
  // and the mobile drawer, so they live in one place.
  const advancedGroups = (
    <div className="flex flex-col gap-4">
      {/* trust level */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-bold text-muted-foreground">مستوى الثقة</legend>
        <div className="flex flex-wrap gap-2">
          {TRUST_OPTS.map((t) => {
            const on = isOn("trust", t.value);
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => toggleMulti("trust", t.value)}
                className={
                  "rounded-full border px-3 py-1.5 text-sm font-semibold transition " +
                  (on
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-foreground hover:bg-muted")
                }
              >
                <span aria-hidden>{t.icon}</span> {t.label}{" "}
                <span className="text-muted-foreground">({t.count})</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* what sets a garage apart */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-bold text-muted-foreground">ما يميّز الكراج</legend>
        <div className="flex flex-wrap gap-2">
          {POSITIVE_OPTS.map((p) => {
            const on = isOn("pos", p.tag);
            return (
              <button
                key={p.tag}
                type="button"
                onClick={() => toggleMulti("pos", p.tag)}
                className={
                  "rounded-full border px-3 py-1.5 text-sm transition " +
                  (on
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                    : "border-border text-foreground hover:bg-muted")
                }
              >
                {p.tag} <span className="text-muted-foreground">({p.count})</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* things to avoid */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-bold text-muted-foreground">
          تجنّب الكراجات التي فيها…
        </legend>
        <div className="flex flex-wrap gap-2">
          {NEGATIVE_OPTS.map((n) => {
            const on = isOn("neg", n.tag);
            return (
              <button
                key={n.tag}
                type="button"
                onClick={() => toggleMulti("neg", n.tag)}
                className={
                  "rounded-full border px-3 py-1.5 text-sm transition " +
                  (on
                    ? "border-orange-500/50 bg-orange-500/15 text-orange-200"
                    : "border-border text-foreground hover:bg-muted")
                }
              >
                {n.tag} <span className="text-muted-foreground">({n.count})</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* score range — single select */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-bold text-muted-foreground">نطاق التقييم</legend>
        <div className="flex flex-wrap gap-2">
          {SCORE_OPTS.map((s) => {
            const on = scoreValue === s.value;
            return (
              <button
                key={s.value || "all"}
                type="button"
                onClick={() => updateParam("score", s.value)}
                className={
                  "rounded-full border px-3 py-1.5 text-sm font-semibold transition " +
                  (on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground hover:bg-muted")
                }
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );

  const countBadge =
    insightsCount > 0 ? (
      <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
        {insightsCount}
      </span>
    ) : null;

  return (
    <div className="flex flex-col gap-3" dir="rtl">
      {/* text search — live as you type, plus an explicit button for clarity */}
      <form onSubmit={onSearchSubmit} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن كراج، منطقة، أو خدمة..."
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-border bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:opacity-90"
        >
          ابحث
        </button>
      </form>

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
          onChange={(e) => onSortChange(e.target.value)}
          className="rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          {nearActive && <option value="distance">الأقرب لك</option>}
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* near me */}
        <button
          type="button"
          onClick={nearMe}
          disabled={locating}
          className={
            "rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:opacity-60 " +
            (nearActive
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-foreground hover:bg-muted")
          }
        >
          📍 {locating ? "جارٍ تحديد موقعك…" : nearActive ? "الأقرب لك" : "الأقرب لي"}
        </button>
      </div>

      {geoErr && <p className="text-sm text-red-500">{geoErr}</p>}

      {/* service mode buttons */}
      <div className="flex flex-wrap gap-2">
        {/* open now */}
        <button
          type="button"
          onClick={() => updateParam("open_now", openNowActive ? "" : "1")}
          className={
            "rounded-xl border px-4 py-2 text-sm font-semibold transition " +
            (openNowActive
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-foreground hover:bg-muted")
          }
        >
          🟢 مفتوح الآن
        </button>

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

      {/* ── Advanced filters — collapsed by default; results stay in view ── */}
      <div>
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          aria-expanded={advancedOpen}
          className="flex items-center gap-2 self-start rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:border-primary/60"
        >
          <span aria-hidden>⚙</span>
          <span>فلاتر متقدمة</span>
          {countBadge}
          <span aria-hidden className="text-muted-foreground">
            {advancedOpen ? "▲" : "▼"}
          </span>
        </button>

        {/* Desktop: inline accordion (mobile uses the drawer below) */}
        <div className={advancedOpen ? "mt-3 hidden rounded-2xl border border-border bg-card/40 p-4 sm:block" : "hidden"}>
          {advancedGroups}
        </div>
      </div>

      {/* Mobile: bottom drawer */}
      {advancedOpen && (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setAdvancedOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[82vh] flex-col rounded-t-2xl border-t border-border bg-background">
            <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted" aria-hidden />
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className="flex items-center gap-2 font-bold">
                فلاتر متقدمة {countBadge}
              </h3>
              <button
                type="button"
                onClick={() => setAdvancedOpen(false)}
                className="text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                إغلاق ✕
              </button>
            </div>
            <div className="overflow-y-auto px-4 pb-2">{advancedGroups}</div>
            <div className="border-t border-border p-4">
              <button
                type="button"
                onClick={() => setAdvancedOpen(false)}
                className="w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground transition hover:opacity-90"
              >
                عرض النتائج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
