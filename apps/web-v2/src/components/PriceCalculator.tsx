"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Calculator, Search, AlertCircle, MessageCircle } from "lucide-react";
import { track } from "@/lib/track";

// Service price ranges in KWD for Kuwait market (2026).
// Sources verified from Kuwaiti garages (karajmotnakel.com, tiresmotnakel.com,
// bmw-service-kuwait.com, kw-service.com, toyotaservicekw.com) — June 2026.
// "quoteOnly" services have too much variance to estimate; we route the user
// to a workshop search instead of showing a misleading range.
type Service = {
  id: string;
  label: string;
  low?: number;
  avg?: number;
  high?: number;
  specialty: string;
  searchQuery: string;
  quoteOnly?: boolean;
};

const SERVICES: readonly Service[] = [
  // — خدمات بأسعار دقيقة —
  { id: "oil_change_jpn", label: "تغيير زيت المحرّك + فلتر", low: 8, avg: 11, high: 15, specialty: "زيوت", searchQuery: "زيت" },
  { id: "brake_pads", label: "تغيير فحمات الفرامل (أمامية)", low: 20, avg: 27, high: 35, specialty: "فرامل", searchQuery: "فرامل" },
  { id: "brake_discs", label: "تغيير ديسكات الفرامل (أمامية)", low: 15, avg: 25, high: 35, specialty: "فرامل", searchQuery: "فرامل ديسكات" },
  { id: "ac_gas", label: "تعبئة غاز التكييف (فريون)", low: 8, avg: 11, high: 15, specialty: "تكييف", searchQuery: "تكييف" },
  { id: "battery", label: "بطارية سيارة جديدة (60Ah)", low: 18, avg: 28, high: 40, specialty: "بطاريات", searchQuery: "بطارية" },
  { id: "tire_single", label: "إطار واحد (مقاس متوسط)", low: 15, avg: 22, high: 35, specialty: "إطارات", searchQuery: "تواير" },
  { id: "wheel_align", label: "ميزان وترصيص (Alignment)", low: 5, avg: 8, high: 12, specialty: "إطارات", searchQuery: "ميزان" },
  { id: "gear_oil", label: "تغيير زيت القير", low: 12, avg: 22, high: 35, specialty: "قير", searchQuery: "زيت قير" },
  { id: "engine_check", label: "فحص كمبيوتر السيارة", low: 5, avg: 8, high: 12, specialty: "كهرباء", searchQuery: "فحص كمبيوتر" },
  { id: "body_dent", label: "إصلاح طبّة (Dent) واحدة", low: 15, avg: 25, high: 40, specialty: "بودي", searchQuery: "بودي" },
  { id: "spark_plugs", label: "تغيير بواجي (4 سلندر)", low: 10, avg: 18, high: 30, specialty: "ميكانيكا", searchQuery: "بواجي" },
  { id: "tow", label: "سطحة داخل المنطقة", low: 10, avg: 15, high: 20, specialty: "متنقل", searchQuery: "سطحة" },

  // — خدمات تحتاج عرض سعر من الكراج (تتفاوت كثيراً حسب الموديل والقطع) —
  { id: "ac_compressor", label: "إصلاح/تغيير كومبروسر التكييف", specialty: "تكييف", searchQuery: "كومبروسر تكييف", quoteOnly: true },
  { id: "gear_repair", label: "إصلاح القير الأوتوماتيك", specialty: "قير", searchQuery: "قير", quoteOnly: true },
  { id: "timing_belt", label: "تغيير سير التايمنق", specialty: "ميكانيكا", searchQuery: "تايمنق", quoteOnly: true },
  { id: "body_paint_full", label: "صبغ كامل للسيارة", specialty: "بودي", searchQuery: "صبغ", quoteOnly: true },
  { id: "tire_set", label: "طقم 4 إطارات", specialty: "إطارات", searchQuery: "تواير 4", quoteOnly: true },
  { id: "electrical", label: "إصلاح أعطال كهربائية", specialty: "كهرباء", searchQuery: "كهرباء", quoteOnly: true },
  { id: "radiator", label: "إصلاح/تغيير الرديتر", specialty: "ميكانيكا", searchQuery: "رديتر", quoteOnly: true },
];

// Car category multipliers — calibrated against real Kuwait garage prices (2026).
const CAR_CATEGORIES = [
  { id: "japanese", label: "يابانية (Toyota, Nissan, Honda)", multiplier: 1.0 },
  { id: "korean", label: "كورية (Kia, Hyundai)", multiplier: 1.0 },
  { id: "american", label: "أمريكية (GMC, Chevrolet, Ford)", multiplier: 1.15 },
  { id: "european", label: "أوروبية (Mercedes, BMW, Audi)", multiplier: 1.4 },
  { id: "luxury", label: "فاخرة (Lexus, Porsche, Range Rover)", multiplier: 1.6 },
] as const;

function formatKWD(n: number): string {
  if (n < 10) return n.toFixed(1);
  return Math.round(n).toString();
}

export function PriceCalculator() {
  const [serviceId, setServiceId] = useState<string>("");
  const [carCategory, setCarCategory] = useState<string>("");
  const [calculated, setCalculated] = useState(false);

  const result = useMemo(() => {
    if (!serviceId || !carCategory) return null;
    const service = SERVICES.find((s) => s.id === serviceId);
    const cat = CAR_CATEGORIES.find((c) => c.id === carCategory);
    if (!service || !cat) return null;
    if (service.quoteOnly) {
      return { service, cat, quoteOnly: true as const };
    }
    return {
      service,
      cat,
      quoteOnly: false as const,
      low: (service.low ?? 0) * cat.multiplier,
      avg: (service.avg ?? 0) * cat.multiplier,
      high: (service.high ?? 0) * cat.multiplier,
    };
  }, [serviceId, carCategory]);

  function handleCalculate() {
    if (!serviceId || !carCategory) return;
    setCalculated(true);
    try {
      track("price_calculator_used", { service: serviceId, category: carCategory });
    } catch {
      // analytics optional
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Calculator className="text-primary" size={24} aria-hidden />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold">حاسبة أسعار خدمات السيارات</h2>
          <p className="text-sm text-muted-foreground">أسعار السوق الكويتي 2026 — مبنية على بيانات كراجات فعلية</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="service-select" className="mb-2 block text-sm font-bold">
            اختر الخدمة
          </label>
          <select
            id="service-select"
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setCalculated(false);
            }}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-medium focus:border-primary focus:outline-none"
          >
            <option value="">— اختر نوع الخدمة —</option>
            <optgroup label="خدمات بأسعار محدّدة">
              {SERVICES.filter((s) => !s.quoteOnly).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="خدمات تحتاج عرض سعر من الكراج">
              {SERVICES.filter((s) => s.quoteOnly).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label htmlFor="car-select" className="mb-2 block text-sm font-bold">
            فئة السيارة
          </label>
          <select
            id="car-select"
            value={carCategory}
            onChange={(e) => {
              setCarCategory(e.target.value);
              setCalculated(false);
            }}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-medium focus:border-primary focus:outline-none"
          >
            <option value="">— اختر فئة سيارتك —</option>
            {CAR_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleCalculate}
          disabled={!serviceId || !carCategory}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-extrabold text-primary-foreground shadow-md transition hover:opacity-90 hover:shadow-primary/30 disabled:cursor-not-allowed disabled:bg-primary/40 disabled:text-primary-foreground/70 disabled:shadow-none"
        >
          <Calculator size={18} aria-hidden />
          احسب السعر
        </button>
      </div>

      {calculated && result && result.quoteOnly && (
        <div className="mt-6 space-y-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="font-bold">{result.service.label}</span>
            <span className="text-sm text-muted-foreground">{result.cat.label}</span>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-background p-4 text-sm">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
            <div className="space-y-2">
              <p className="font-bold">هذه الخدمة تختلف كثيراً حسب الموديل والقطع</p>
              <p className="text-muted-foreground">
                إعطاءك سعر تقريبي هنا قد يكون مضلّلاً. الأفضل تطلب عرض سعر مباشر من الكراج بعد فحص السيارة.
              </p>
            </div>
          </div>

          <Link
            href={`/search?q=${encodeURIComponent(result.service.searchQuery)}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-6 py-3 text-base font-bold text-background transition hover:opacity-90"
            onClick={() => {
              try {
                track("price_calculator_quote_click", {
                  service: serviceId,
                  category: carCategory,
                });
              } catch {
                // optional
              }
            }}
          >
            <Search size={18} aria-hidden />
            ابحث عن كراج واطلب عرض السعر
          </Link>
        </div>
      )}

      {calculated && result && !result.quoteOnly && (
        <div className="mt-6 space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="font-bold">{result.service.label}</span>
            <span className="text-sm text-muted-foreground">{result.cat.label}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-background p-3">
              <div className="text-xs font-bold text-muted-foreground">منخفض</div>
              <div className="mt-1 text-2xl font-extrabold text-green-600">
                {formatKWD(result.low)}
              </div>
              <div className="text-xs text-muted-foreground">د.ك</div>
            </div>
            <div className="rounded-lg border-2 border-primary bg-background p-3">
              <div className="text-xs font-bold text-primary">متوسط</div>
              <div className="mt-1 text-2xl font-extrabold">
                {formatKWD(result.avg)}
              </div>
              <div className="text-xs text-muted-foreground">د.ك</div>
            </div>
            <div className="rounded-lg bg-background p-3">
              <div className="text-xs font-bold text-muted-foreground">مرتفع</div>
              <div className="mt-1 text-2xl font-extrabold text-orange-600">
                {formatKWD(result.high)}
              </div>
              <div className="text-xs text-muted-foreground">د.ك</div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
            <p className="text-muted-foreground">
              الأسعار تقديرية وتختلف حسب الكراج والقطع المستخدمة. السعر النهائي يتحدد بعد الفحص.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link
              href={`/search?q=${encodeURIComponent(result.service.searchQuery)}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background transition hover:opacity-90"
              onClick={() => {
                try {
                  track("price_calculator_search_click", {
                    service: serviceId,
                    category: carCategory,
                  });
                } catch {
                  // optional
                }
              }}
            >
              <Search size={16} aria-hidden />
              ابحث عن كراج
            </Link>
            <Link
              href={`/asaali?service=${encodeURIComponent(result.service.label)}`}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-background px-4 py-3 text-sm font-bold text-foreground transition hover:bg-foreground/5"
              onClick={() => {
                try {
                  track("price_calculator_asaali_click", {
                    service: serviceId,
                    category: carCategory,
                  });
                } catch {
                  // optional
                }
              }}
            >
              <MessageCircle size={16} aria-hidden />
              اسأل دق سلف
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
