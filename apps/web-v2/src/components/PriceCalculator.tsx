"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Calculator, Search, AlertCircle } from "lucide-react";
import { track } from "@vercel/analytics";

// Service categories with price ranges in KWD for Kuwait market (2026 data).
// Multipliers applied based on car category.
const SERVICES = [
  { id: "oil_change", label: "تغيير زيت المحرّك + فلتر", low: 8, avg: 14, high: 25, specialty: "زيوت", searchQuery: "زيت" },
  { id: "brake_pads", label: "تغيير فحمات الفرامل", low: 20, avg: 35, high: 80, specialty: "صيانة", searchQuery: "فرامل" },
  { id: "brake_discs", label: "تغيير ديسكات الفرامل", low: 40, avg: 75, high: 180, specialty: "صيانة", searchQuery: "فرامل ديسكات" },
  { id: "ac_gas", label: "تعبئة غاز التكييف (فريون)", low: 8, avg: 15, high: 30, specialty: "تكييف", searchQuery: "تكييف" },
  { id: "ac_compressor", label: "إصلاح كومبروسر التكييف", low: 80, avg: 150, high: 350, specialty: "تكييف", searchQuery: "كومبروسر تكييف" },
  { id: "battery", label: "بطارية سيارة جديدة", low: 18, avg: 30, high: 65, specialty: "بطاريات", searchQuery: "بطارية" },
  { id: "tire_single", label: "إطار واحد (بدون موازنة)", low: 15, avg: 30, high: 90, specialty: "تواير", searchQuery: "تواير" },
  { id: "tire_set", label: "طقم 4 إطارات (مع موازنة)", low: 70, avg: 140, high: 380, specialty: "تواير", searchQuery: "تواير 4" },
  { id: "wheel_align", label: "ميزان وترصيص (Alignment)", low: 5, avg: 10, high: 20, specialty: "تواير", searchQuery: "ميزان" },
  { id: "gear_oil", label: "تغيير زيت القير", low: 15, avg: 30, high: 70, specialty: "قير", searchQuery: "زيت قير" },
  { id: "gear_repair", label: "إصلاح القير الأوتوماتيك", low: 150, avg: 350, high: 900, specialty: "قير", searchQuery: "قير" },
  { id: "engine_check", label: "فحص كمبيوتر السيارة", low: 5, avg: 10, high: 20, specialty: "كهرباء", searchQuery: "فحص كمبيوتر" },
  { id: "electrical", label: "إصلاح أعطال كهربائية", low: 15, avg: 40, high: 120, specialty: "كهرباء", searchQuery: "كهرباء" },
  { id: "body_dent", label: "إصلاح طبّة (Dent) واحدة", low: 15, avg: 35, high: 80, specialty: "بودي", searchQuery: "بودي" },
  { id: "body_paint_full", label: "صبغ كامل للسيارة", low: 130, avg: 250, high: 550, specialty: "بودي", searchQuery: "صبغ" },
  { id: "timing_belt", label: "تغيير سير التايمنق", low: 50, avg: 100, high: 280, specialty: "ميكانيكا", searchQuery: "تايمنق" },
  { id: "radiator", label: "إصلاح/تغيير الرديتر", low: 30, avg: 60, high: 180, specialty: "ميكانيكا", searchQuery: "رديتر" },
  { id: "spark_plugs", label: "تغيير بواجي (Spark Plugs)", low: 10, avg: 25, high: 70, specialty: "ميكانيكا", searchQuery: "بواجي" },
  { id: "tow", label: "سطحة (داخل المنطقة)", low: 10, avg: 15, high: 25, specialty: "متنقل", searchQuery: "سطحة" },
  { id: "tow_intercity", label: "سطحة بين المناطق", low: 15, avg: 25, high: 40, specialty: "متنقل", searchQuery: "سطحة" },
] as const;

// Car categories with cost multipliers (Kuwait market reality).
const CAR_CATEGORIES = [
  { id: "japanese", label: "يابانية (Toyota, Nissan, Honda)", multiplier: 1.0 },
  { id: "korean", label: "كورية (Kia, Hyundai)", multiplier: 1.0 },
  { id: "american", label: "أمريكية (GMC, Chevrolet, Ford)", multiplier: 1.25 },
  { id: "european", label: "أوروبية (Mercedes, BMW, Audi)", multiplier: 1.75 },
  { id: "luxury", label: "فاخرة (Lexus, Porsche, Range Rover)", multiplier: 2.0 },
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
    return {
      service,
      cat,
      low: service.low * cat.multiplier,
      avg: service.avg * cat.multiplier,
      high: service.high * cat.multiplier,
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
          <p className="text-sm text-muted-foreground">أسعار السوق الكويتي 2026</p>
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
            {SERVICES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
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
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Calculator size={18} aria-hidden />
          احسب السعر
        </button>
      </div>

      {calculated && result && (
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
              الأسعار تقديرية وقد تختلف ±20% حسب الكراج والمنطقة. اطلب عرض السعر قبل البدء.
            </p>
          </div>

          <Link
            href={`/search?q=${encodeURIComponent(result.service.searchQuery)}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-6 py-3 text-base font-bold text-background transition hover:opacity-90"
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
            <Search size={18} aria-hidden />
            ابحث عن كراج لهذه الخدمة
          </Link>
        </div>
      )}
    </div>
  );
}
