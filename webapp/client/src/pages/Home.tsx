import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronLeft, Sparkles } from "lucide-react";
import { Layout } from "@/components/Layout";
import { LogoHero, TAGLINE } from "@/components/Brand";
import { HashLink } from "@/components/SearchLink";
import { WorkshopCard, WorkshopCardSkeleton } from "@/components/WorkshopCard";
import { fetchGovernorates, fetchWorkshops } from "@/lib/api";
import { TOP_SPECIALTIES } from "@/lib/brand";
import type { GovernorateItem, WorkshopsResponse } from "@/lib/types";

export default function Home() {
  const [q, setQ] = useState("");

  const govs = useQuery<GovernorateItem[]>({
    queryKey: ["/api/governorates"],
    queryFn: fetchGovernorates,
  });
  const top = useQuery<WorkshopsResponse>({
    queryKey: ["/api/workshops", "top-rated"],
    queryFn: () => fetchWorkshops({ min_rating: 4.8, sort: "reviews", limit: 12 }),
  });

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    // Set the hash directly so the query string lives inside the hash route
    // (#/search?q=...), which is where useHashQuery reads it from.
    window.location.hash = `#/search${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`;
  };

  const topRated = (top.data?.results || []).filter((w) => (w.reviews_count ?? 0) >= 50).slice(0, 10);

  return (
    <Layout>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 0%, #FFD60A 0%, transparent 55%)",
          }}
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pb-12 pt-16 text-center md:pt-24">
          <LogoHero className="h-40 md:h-56" />
          <p className="mt-5 text-2xl font-extrabold text-primary md:text-4xl">{TAGLINE}</p>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground md:text-base">
            دليلك لكل كراج، مركز صيانة، ومحل قطع غيار في الكويت — في مكان واحد.
          </p>

          <form onSubmit={submitSearch} className="mt-8 w-full">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-input p-2 focus-within:border-primary">
              <Search size={20} className="mr-2 shrink-0 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث عن كراج، مركز، تخصص، أو منطقة..."
                className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                aria-label="بحث"
                data-testid="input-hero-search"
              />
              <button
                type="submit"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover-elevate active-elevate-2"
                data-testid="button-hero-search"
              >
                بحث
              </button>
            </div>
          </form>

          {/* Quick filter chips */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {TOP_SPECIALTIES.map((s) => (
              <HashLink
                key={s}
                to={`/search?specialty=${encodeURIComponent(s)}`}
                className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-semibold hover-elevate"
                testid={`chip-specialty-${s}`}
              >
                {s}
              </HashLink>
            ))}
          </div>
        </div>

      </section>

      {/* BROWSE BY GOVERNORATE */}
      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-extrabold md:text-2xl">تصفّح حسب المحافظة</h2>
            <p className="mt-1 text-sm text-muted-foreground">اختر محافظتك لعرض المنشآت القريبة</p>
          </div>
        </div>

        {govs.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl border border-card-border bg-card" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(govs.data || []).map((g) => (
              <HashLink
                key={g.name}
                to={`/search?governorate=${encodeURIComponent(g.name)}`}
                className="group flex flex-col justify-between rounded-xl border border-card-border bg-card p-5 hover-elevate"
                testid={`card-gov-${g.name}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{g.name}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      اضغط للتصفّح
                    </p>
                  </div>
                  <ChevronLeft size={20} className="text-muted-foreground transition-transform group-hover:-translate-x-1" />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {g.areas.slice(0, 4).map((a) => (
                    <span key={a.area} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      {a.area}
                    </span>
                  ))}
                </div>
              </HashLink>
            ))}
          </div>
        )}
      </section>

      {/* TOP RATED */}
      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={22} className="text-primary" />
            <div>
              <h2 className="text-xl font-extrabold md:text-2xl">الأعلى تقييمًا</h2>
              <p className="mt-1 text-sm text-muted-foreground">حسب تقييمات Google Maps</p>
            </div>
          </div>
          <HashLink to="/search?min_rating=4.8" className="text-sm font-semibold text-primary hover:underline" testid="link-see-all-top">
            عرض الكل
          </HashLink>
        </div>

        {top.isLoading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-64 shrink-0">
                <WorkshopCardSkeleton />
              </div>
            ))}
          </div>
        ) : (
          <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
            {topRated.map((w) => (
              <div key={w.place_id} className="w-64 shrink-0 snap-start sm:w-72">
                <WorkshopCard w={w} />
              </div>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
