import type { Metadata } from "next";
import Link from "next/link";
import {
  ANALYTICS_RANGES,
  fetchConversionAnalytics,
  type AnalyticsRange,
  type ConversionAnalytics,
} from "@/lib/admin-analytics";

export const metadata: Metadata = {
  title: "التحويلات والأداء",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const POSTHOG_DASHBOARD = "https://eu.posthog.com/project/238180/dashboard/890939";
const SOURCE_LABELS: Record<string, string> = {
  quote_bar: "شريط طلب السعر",
  translator: "المترجم",
  asaali: "اسألني",
  concierge: "المساعد",
};

function validRange(value: string | undefined): AnalyticsRange {
  const parsed = Number(value);
  return ANALYTICS_RANGES.includes(parsed as AnalyticsRange)
    ? (parsed as AnalyticsRange)
    : 30;
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-[#FFD60A]">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function Breakdown({
  title,
  rows,
  labels,
}: {
  title: string;
  rows: ConversionAnalytics["sources"];
  labels?: Record<string, string>;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-extrabold">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.map((row) => (
            <div key={row.name}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span>{labels?.[row.name] ?? row.name}</span>
                <span className="font-bold">{row.count} · {row.percent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[#FFD60A]"
                  style={{ width: `${Math.max(row.percent, row.count ? 2 : 0)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">لا توجد بيانات في هذه الفترة.</p>
        )}
      </div>
    </section>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = validRange(daysParam);
  let analytics: ConversionAnalytics | null = null;
  let loadError = false;
  try {
    analytics = await fetchConversionAnalytics(days);
  } catch {
    loadError = true;
  }

  const quotes = analytics?.stages[0].count ?? 0;
  const withOffers = analytics?.stages[2].count ?? 0;
  const accepted = analytics?.stages[3].count ?? 0;
  const maxDaily = Math.max(
    1,
    ...(analytics?.daily.map((day) => Math.max(day.quotes, day.offers, day.accepted)) ?? [1])
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">التحويلات والأداء</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            مراحل الطلبات من قاعدة التشغيل، ومسار البحث والتواصل المجهول داخل لوحة القياس.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ANALYTICS_RANGES.map((range) => (
            <Link
              key={range}
              href={`/admin/analytics?days=${range}`}
              className={`rounded-lg px-3 py-2 text-sm font-bold ${
                days === range
                  ? "bg-[#FFD60A] text-[#0A0A0A]"
                  : "border border-border bg-card hover:border-[#FFD60A]"
              }`}
            >
              {range} يوم
            </Link>
          ))}
        </div>
      </div>

      {loadError || !analytics ? (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-400">
          تعذّر تحميل أرقام التحويلات الآن. لم تُعرض أرقام جزئية أو تقديرية.
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="طلبات السعر" value={quotes} note={`آخر ${days} يوم`} />
            <MetricCard
              label="إجمالي عروض الكراجات"
              value={analytics.totalOffers}
              note={`${withOffers} طلب وصل إليه عرض`}
            />
            <MetricCard
              label="تحويل الطلب إلى عرض"
              value={`${analytics.stages[2].fromStart}%`}
              note="طلبات وصلها عرض واحد على الأقل"
            />
            <MetricCard
              label="تحويل العرض إلى قبول"
              value={`${analytics.stages[3].fromPrevious}%`}
              note={`${accepted} طلب مقبول`}
            />
          </div>

          <section className="mt-6 rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-extrabold">مسار تشغيل الطلب</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  النسب بين كل مرحلة والتي قبلها؛ رحلة العميل المجهولة منفصلة بالأسفل.
                </p>
              </div>
              <span className="rounded-lg bg-muted px-3 py-2 text-sm">
                وسيط أول عرض: <b>{analytics.medianFirstOfferHours == null ? "—" : `${analytics.medianFirstOfferHours} ساعة`}</b>
              </span>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-4">
              {analytics.stages.map((stage, index) => (
                <div key={stage.key} className="relative rounded-xl border border-border bg-background p-4">
                  <p className="text-sm text-muted-foreground">{stage.label}</p>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <b className="text-3xl">{stage.count}</b>
                    <span className="text-xs text-muted-foreground">
                      {index === 0 ? "بداية المسار" : `${stage.fromPrevious}% من السابقة`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-extrabold">الحركة اليومية</h2>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>● طلبات</span><span className="text-blue-400">● عروض</span><span className="text-green-400">● قبول</span>
              </div>
            </div>
            <div className="mt-5 flex h-44 items-end gap-1 overflow-x-auto pb-1" aria-label="الحركة اليومية">
              {analytics.daily.map((day) => (
                <div key={day.date} className="flex h-full min-w-3 flex-1 items-end gap-px" title={`${day.date}: ${day.quotes} طلب، ${day.offers} عرض، ${day.accepted} قبول`}>
                  <div className="min-h-px flex-1 rounded-t bg-[#FFD60A]" style={{ height: `${(day.quotes / maxDaily) * 100}%` }} />
                  <div className="min-h-px flex-1 rounded-t bg-blue-400" style={{ height: `${(day.offers / maxDaily) * 100}%` }} />
                  <div className="min-h-px flex-1 rounded-t bg-green-400" style={{ height: `${(day.accepted / maxDaily) * 100}%` }} />
                </div>
              ))}
            </div>
          </section>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Breakdown title="مصادر الطلبات" rows={analytics.sources} labels={SOURCE_LABELS} />
            <Breakdown title="أكثر الخدمات طلبًا" rows={analytics.services} />
          </div>
        </>
      )}

      <section className="mt-6 rounded-2xl border border-[#FFD60A]/40 bg-[#FFD60A]/5 p-5">
        <h2 className="font-extrabold">رحلة العميل قبل إنشاء الطلب</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          لوحة منفصلة تحسب البحث ← واتساب، والبحث ← بدء الطلب ← إرساله بهوية مجهولة ومن دون بيانات شخصية.
        </p>
        <a
          href={POSTHOG_DASHBOARD}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex rounded-lg bg-[#FFD60A] px-4 py-2 text-sm font-extrabold text-[#0A0A0A]"
        >
          فتح لوحة رحلة العميل ↗
        </a>
      </section>
    </main>
  );
}
