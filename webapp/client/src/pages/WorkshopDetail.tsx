import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Phone,
  MapPin,
  Navigation,
  Globe,
  ChevronRight,
  CheckCircle2,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { Layout } from "@/components/Layout";
import { EntityBadge } from "@/components/EntityBadge";
import { RatingStars } from "@/components/RatingStars";
import { BrandedCover } from "@/components/BrandedCover";
import { ErrorState } from "@/components/States";
import { fetchWorkshop } from "@/lib/api";
import type { WorkshopDetail as TDetail } from "@/lib/types";
import { DAY_AR, DAY_ORDER, todayName, formatHours } from "@/lib/brand";
import { BUSINESS_WA } from "@/components/Brand";

export default function WorkshopDetail() {
  const [, params] = useRoute("/workshop/:place_id");
  const placeId = params?.place_id || "";

  const { data, isLoading, isError, refetch } = useQuery<TDetail>({
    queryKey: ["/api/workshops", placeId],
    queryFn: () => fetchWorkshop(placeId),
    enabled: !!placeId,
  });

  const tel = data?.phone_intl ? data.phone_intl.replace(/\s/g, "") : data?.phone || null;
  const waNumber = tel ? tel.replace(/^\+/, "") : null;
  const waLink = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent("مرحبا، شفت رقمكم في degself")}`
    : null;
  const today = todayName();

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary" data-testid="link-bc-home">الرئيسية</Link>
          <ChevronRight size={14} className="rotate-180" />
          <Link href="/search" className="hover:text-primary" data-testid="link-bc-search">تصفّح</Link>
          <ChevronRight size={14} className="rotate-180" />
          <span className="clamp-1 max-w-[50%] text-foreground/80">{data?.name || "…"}</span>
        </nav>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <DetailSkeleton />
        ) : (
          <div className="space-y-6">
            {/* Hero image */}
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-card-border bg-secondary md:aspect-[21/9]">
              <BrandedCover
                name={data.name}
                entityType={data.entity_type}
                specialty={data.specialty}
                variant="banner"
              />
              <div className="absolute bottom-3 right-3">
                <EntityBadge type={data.entity_type} className="backdrop-blur-sm" />
              </div>
            </div>

            {/* Header */}
            <div className="flex flex-col gap-3">
              <h1 className="text-2xl font-extrabold leading-tight md:text-3xl" data-testid="text-workshop-name">
                {data.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">{data.specialty}</span>
                <RatingStars rating={data.rating} reviews={data.reviews_count} size={18} />
                {data.open_now != null && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                      data.open_now ? "bg-green-500/15 text-green-400" : "bg-destructive/15 text-destructive"
                    }`}
                    data-testid="badge-open-now"
                  >
                    <span className={`h-2 w-2 rounded-full ${data.open_now ? "bg-green-400" : "bg-destructive"}`} />
                    {data.open_now ? "مفتوح الآن" : "مغلق الآن"}
                  </span>
                )}
              </div>
              <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPin size={16} className="mt-0.5 shrink-0" />
                <span>{[data.address, data.area, data.governorate].filter(Boolean).join("، ")}</span>
              </p>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {tel ? (
                <a
                  href={`tel:${tel}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 text-base font-extrabold text-primary-foreground hover-elevate active-elevate-2"
                  data-testid="button-call"
                >
                  <Phone size={20} /> اتصل الآن
                </a>
              ) : (
                <div className="flex items-center justify-center rounded-xl border border-border bg-card px-4 py-4 text-sm text-muted-foreground">
                  لا يوجد رقم هاتف
                </div>
              )}
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-4 text-base font-bold hover-elevate active-elevate-2"
                  data-testid="button-whatsapp"
                >
                  <SiWhatsapp size={20} className="text-green-400" /> واتساب
                </a>
              )}
              {data.google_url && (
                <a
                  href={data.google_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-4 text-base font-bold hover-elevate active-elevate-2"
                  data-testid="button-directions"
                >
                  <Navigation size={20} className="text-primary" /> الاتجاهات
                </a>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Opening hours */}
              <section className="rounded-xl border border-card-border bg-card p-5">
                <h2 className="mb-3 text-lg font-bold">ساعات العمل</h2>
                {data.opening_hours_raw && data.opening_hours_raw.length ? (
                  <table className="w-full text-sm">
                    <tbody>
                      {DAY_ORDER.map((d) => {
                        const row = data.opening_hours_raw!.find((r) => r.day === d);
                        if (!row) return null;
                        const isToday = d === today;
                        return (
                          <tr key={d} className={`border-b border-border/50 last:border-0 ${isToday ? "text-primary" : ""}`}>
                            <td className={`py-2 ${isToday ? "font-bold" : "font-semibold"}`}>
                              {DAY_AR[d]} {isToday && <span className="text-xs">(اليوم)</span>}
                            </td>
                            <td className="py-2 text-left font-en text-xs text-muted-foreground">{formatHours(row.hours)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-muted-foreground">ساعات العمل غير متوفّرة.</p>
                )}

                {data.payments && (
                  <div className="mt-4 flex items-start gap-2 border-t border-border/50 pt-4 text-sm">
                    <CreditCard size={16} className="mt-0.5 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{data.payments}</span>
                  </div>
                )}
                {data.website && (
                  <a
                    href={data.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                    data-testid="link-website"
                  >
                    <Globe size={16} /> الموقع الإلكتروني
                  </a>
                )}
                {data.specialty_hints && data.specialty_hints.length > 0 && (
                  <div className="mt-4 border-t border-border/50 pt-4">
                    <h3 className="mb-2 text-sm font-bold">خدمات متوفّرة</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {data.specialty_hints.map((h) => (
                        <span key={h} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">
                          <CheckCircle2 size={12} className="text-primary" /> {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Map */}
              <section className="overflow-hidden rounded-xl border border-card-border bg-card">
                <iframe
                  title="الموقع على الخريطة"
                  className="h-full min-h-[300px] w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${data.longitude - 0.008}%2C${data.latitude - 0.005}%2C${data.longitude + 0.008}%2C${data.latitude + 0.005}&layer=mapnik&marker=${data.latitude}%2C${data.longitude}`}
                  data-testid="iframe-map"
                />
              </section>
            </div>

            {/* Report data issue */}
            <section className="rounded-xl border border-border bg-card/40 p-5">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="mt-0.5 shrink-0 text-primary" />
                  <div>
                    <h3 className="text-sm font-bold">لاحظت معلومة غير صحيحة؟</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      ساعدنا في تحديث بيانات هذا الكراج — تواصل مع فريق دق سلف عبر واتساب.
                    </p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${BUSINESS_WA}?text=${encodeURIComponent(`السلام عليكم، أرغب في الإبلاغ عن معلومة تحتاج تحديث في صفحة الكراج:\n\n${data.name}\nhttps://degself.com/workshop/${placeId}\n\nالمعلومة:`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover-elevate active-elevate-2"
                  data-testid="button-report-issue"
                >
                  <SiWhatsapp size={16} />
                  بلّغنا
                </a>
              </div>
            </section>
          </div>
        )}
      </div>
    </Layout>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="aspect-[16/9] animate-pulse rounded-2xl bg-card md:aspect-[21/9]" />
      <div className="h-8 w-2/3 animate-pulse rounded bg-card" />
      <div className="h-5 w-1/3 animate-pulse rounded bg-card" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-card" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl bg-card" />
        <div className="h-64 animate-pulse rounded-xl bg-card" />
      </div>
    </div>
  );
}
