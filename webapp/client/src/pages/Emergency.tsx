import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHashQuery } from "@/lib/useHashQuery";
import { Phone, MapPin, Wrench, Truck } from "lucide-react";
import { Layout } from "@/components/Layout";
import { HashLink } from "@/components/SearchLink";
import { WorkshopCard, WorkshopCardSkeleton } from "@/components/WorkshopCard";
import { fetchWorkshops, fetchGovernorates } from "@/lib/api";
import type { WorkshopsResponse, GovernorateItem } from "@/lib/types";

type Mode = "tow" | "mobile";

const MODES: Record<Mode, { label: string; specialty: string; icon: typeof Truck; tagline: string }> = {
  tow: {
    label: "سطحة / ونش",
    specialty: "ونش وسحب",
    icon: Truck,
    tagline: "نقل سيارتك المعطلة لأقرب كراج",
  },
  mobile: {
    label: "كراج متنقل",
    specialty: "كراج متنقل",
    icon: Wrench,
    tagline: "تصليح / بنشر / بطارية في موقعك",
  },
};

export default function Emergency() {
  const { params } = useHashQuery();
  const initialMode = (params.get("mode") === "mobile" ? "mobile" : "tow") as Mode;
  const [mode, setMode] = useState<Mode>(initialMode);
  const [gov, setGov] = useState<string>("");

  // Sync mode with URL when user clicks the home banner buttons after page load
  useEffect(() => {
    const next = (params.get("mode") === "mobile" ? "mobile" : "tow") as Mode;
    setMode(next);
  }, [params]);

  const govs = useQuery<GovernorateItem[]>({
    queryKey: ["/api/governorates"],
    queryFn: fetchGovernorates,
  });

  const list = useQuery<WorkshopsResponse>({
    queryKey: ["/api/workshops", "emergency", mode, gov],
    queryFn: () =>
      fetchWorkshops({
        specialty: [MODES[mode].specialty],
        governorate: gov ? [gov] : undefined,
        sort: "rating",
        limit: 60,
      }),
  });

  const current = MODES[mode];
  const Icon = current.icon;
  const results = list.data?.results || [];

  return (
    <Layout>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-destructive/10 via-background to-background">
        <div className="mx-auto max-w-4xl px-4 pb-8 pt-10 md:pt-14">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
              </span>
              خدمات الطوارئ
            </div>
            <h1 className="mt-4 text-2xl font-extrabold md:text-4xl">سيارتك عطلانة الحين؟</h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              اختر الخدمة المناسبة، اتصل مباشرة بأقرب مزوّد
            </p>
          </div>

          {/* Toggle */}
          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1.5">
            {(Object.entries(MODES) as [Mode, typeof MODES[Mode]][]).map(([k, v]) => {
              const M = v.icon;
              const active = mode === k;
              return (
                <button
                  key={k}
                  onClick={() => setMode(k)}
                  data-testid={`btn-mode-${k}`}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground hover-elevate"
                  }`}
                >
                  <M size={18} />
                  {v.label}
                </button>
              );
            })}
          </div>

          {/* Governorate filter */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setGov("")}
              data-testid="btn-gov-all"
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                gov === ""
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover-elevate"
              }`}
            >
              كل المحافظات
            </button>
            {(govs.data || []).map((g) => (
              <button
                key={g.name}
                onClick={() => setGov(g.name)}
                data-testid={`btn-gov-${g.name}`}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                  gov === g.name
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover-elevate"
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>

          {/* Tagline */}
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Icon size={16} />
            {current.tagline}
          </div>
        </div>
      </section>

      {/* RESULTS */}
      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {list.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <WorkshopCardSkeleton key={i} />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-base text-muted-foreground">لا يوجد نتائج في هذه المحافظة</p>
            <button
              onClick={() => setGov("")}
              className="mt-3 text-sm font-semibold text-primary hover:underline"
            >
              عرض كل المحافظات
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              يعرض الأعلى تقييماً من Google Maps
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((w) => (
                <WorkshopCard key={w.place_id} w={w} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Tips */}
      <section className="mx-auto max-w-4xl px-4 pb-12 md:px-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-base font-bold">نصائح قبل الاتصال</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-primary" />
              جهّز موقعك بدقة (شارع، قطعة، علامة مميزة قريبة)
            </li>
            <li className="flex gap-2">
              <Phone size={16} className="mt-0.5 shrink-0 text-primary" />
              اتفق على السعر التقريبي قبل وصول الخدمة
            </li>
            <li className="flex gap-2">
              <Wrench size={16} className="mt-0.5 shrink-0 text-primary" />
              اوصف العطل بوضوح (لا يشتغل، بنشر، بطارية، حادث، إلخ)
            </li>
          </ul>
        </div>
      </section>
    </Layout>
  );
}
