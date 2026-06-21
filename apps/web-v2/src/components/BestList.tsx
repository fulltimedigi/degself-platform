// Presentational pieces for the "best garages" pages: ranked cards, specialty
// tabs, and WhatsApp/X share buttons. All server-rendered (share = plain links).
import Link from "next/link";
import type { BestWorkshop, BestCategory } from "@/lib/best";

const SITE = "https://degself.com";

/** One ranked garage: position, name, location, smart score, top positive tags. */
function BestCard({ w, rank }: { w: BestWorkshop; rank: number }) {
  const location = [w.neighborhood ?? w.area, w.governorate].filter(Boolean).join(" · ");
  const tags = (w.enrichment.positive_tags ?? []).slice(0, 3);
  return (
    <Link
      href={`/workshop/${w.place_id}`}
      className="group flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className="shrink-0 text-sm font-bold text-muted-foreground">
            {rank}.
          </span>
          <h3 className="text-[15px] font-bold leading-tight transition group-hover:text-primary">
            {w.name}
          </h3>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary/40 bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary shadow-[0_0_10px_rgba(255,214,10,0.35)]">
          ⭐ {Math.round(w.enrichment.smart_score)}
        </span>
      </div>

      {location && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {location}
        </p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t.label}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200"
            >
              <span aria-hidden>{t.icon}</span>
              {t.label}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

/** Specialty tabs — "الكل" + one link per populated specialty. */
function BestTabs({
  categories,
  active,
}: {
  categories: BestCategory[];
  active: string | null; // null → "الكل"
}) {
  const tab = (href: string, label: string, on: boolean, count?: number) => (
    <Link
      key={href}
      href={href}
      className={
        "shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition " +
        (on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-foreground hover:bg-muted")
      }
    >
      {label}
      {count != null && (
        <span className={on ? "" : "text-muted-foreground"}> ({count})</span>
      )}
    </Link>
  );
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {tab("/best", "الكل", active === null)}
      {categories.map((c) =>
        tab(`/best/${encodeURIComponent(c.specialty)}`, c.specialty, active === c.specialty, c.count)
      )}
    </div>
  );
}

/** WhatsApp + X share for the current (overall or per-specialty) list. */
function ShareButtons({ url, text }: { url: string; text: string }) {
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">مشاركة:</span>
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold transition hover:border-primary hover:text-primary"
      >
        واتساب
      </a>
      <a
        href={x}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold transition hover:border-primary hover:text-primary"
      >
        X
      </a>
    </div>
  );
}

/** Full list section: tabs + share + ranked grid. Reused by /best and /best/[category]. */
export function BestList({
  workshops,
  categories,
  active,
  shareText,
}: {
  workshops: BestWorkshop[];
  categories: BestCategory[];
  active: string | null;
  shareText: string;
}) {
  const shareUrl = active ? `${SITE}/best/${encodeURIComponent(active)}` : `${SITE}/best`;
  return (
    <>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <BestTabs categories={categories} active={active} />
        </div>
        <ShareButtons url={shareUrl} text={shareText} />
      </div>

      {workshops.length === 0 ? (
        <p className="mt-8 text-muted-foreground">لا توجد كراجات ضمن هذا التخصص بعد.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workshops.map((w, i) => (
            <BestCard key={w.place_id} w={w} rank={i + 1} />
          ))}
        </div>
      )}
    </>
  );
}
