"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  DEFAULT_VALIDITY_DAYS,
  MIN_WARRANTY_DAYS,
  PARTS_TYPES,
  PRICING_TYPES,
} from "@/lib/quote-status";
import type { OfferErrors } from "@/lib/offer-validation";

export interface StructuredOfferFormState {
  workshop_name: string;
  workshop_phone: string;
  pricing_type: string;
  price_kwd: string;
  price_max_kwd: string;
  assumed_diagnosis: string;
  inspection_fee_kwd: string;
  parts_type: string;
  validity_days: string;
  warranty_days: string;
  warranty_note: string;
  estimated_duration: string;
  notes: string;
}

const WARRANTY_PRESETS = [7, 30, 90, 180, 365] as const;
const DURATION_OPTIONS = [
  ["same_day", "نفس اليوم"],
  ["1_day", "يوم"],
  ["2_days", "يومان"],
  ["3_days", "3 أيام"],
  ["4_7_days", "4–7 أيام"],
  ["over_week", "أكثر من أسبوع"],
  ["unknown_until_inspection", "غير معروف حتى الفحص"],
] as const;

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-3 text-base focus:border-[#FFD60A] focus:outline-none";
const labelCls = "mb-1.5 block text-sm font-extrabold";

export function StructuredOfferFields({
  form,
  onChange,
  onBlur,
  showError,
}: {
  form: StructuredOfferFormState;
  onChange: (patch: Partial<StructuredOfferFormState>) => void;
  onBlur: (name: string) => void;
  showError: (name: keyof OfferErrors) => string | undefined;
}) {
  const t = useTranslations();
  const [showValidity, setShowValidity] = useState(false);
  const [showNotes, setShowNotes] = useState(Boolean(form.notes));

  const presetWarranty = useMemo(
    () => WARRANTY_PRESETS.includes(Number(form.warranty_days) as (typeof WARRANTY_PRESETS)[number]),
    [form.warranty_days]
  );
  const customWarranty = Boolean(form.warranty_days) && !presetWarranty;

  const cls = (name: keyof OfferErrors) =>
    `${inputCls} ${showError(name) ? "border-red-500 focus:border-red-500" : "border-border"}`;

  function Err({ name }: { name: keyof OfferErrors }) {
    const e = showError(name);
    return e ? <p className="mt-1 text-xs font-bold text-red-400">{e}</p> : null;
  }

  const choiceClass = (active: boolean) =>
    `rounded-lg border px-3 py-2.5 text-sm font-bold transition ${
      active ? "border-[#FFD60A] bg-[#FFD60A] text-[#0A0A0A]" : "border-border bg-background"
    }`;

  const setPricingType = (pricingType: string) => {
    onChange({
      pricing_type: pricingType,
      price_kwd: "",
      price_max_kwd: "",
      assumed_diagnosis: "",
      inspection_fee_kwd: "",
    });
  };

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>اسم الكراج *</label>
          <input
            className={cls("workshop_name")}
            value={form.workshop_name}
            onChange={(e) => onChange({ workshop_name: e.target.value })}
            onBlur={() => onBlur("workshop_name")}
            maxLength={120}
          />
          <Err name="workshop_name" />
        </div>
        <div>
          <label className={labelCls}>رقم هاتف الكراج</label>
          <input
            className={inputCls}
            dir="ltr"
            value={form.workshop_phone}
            onChange={(e) => onChange({ workshop_phone: e.target.value })}
            maxLength={20}
          />
        </div>
      </section>

      <section>
        <label className={labelCls}>كيف تحسب السعر؟ *</label>
        <div className="grid grid-cols-3 gap-2">
          {PRICING_TYPES.map((opt) => {
            const label = opt === "fixed" ? "سعر نهائي" : opt === "range" ? "من — إلى" : "السعر بعد الفحص";
            return (
              <button
                key={opt}
                type="button"
                className={choiceClass(form.pricing_type === opt)}
                onClick={() => setPricingType(opt)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {form.pricing_type === "fixed" && (
        <section>
          <label className={labelCls}>السعر النهائي *</label>
          <div className="relative">
            <input
              className={cls("price_kwd")}
              inputMode="decimal"
              value={form.price_kwd}
              onChange={(e) => onChange({ price_kwd: e.target.value })}
              onBlur={() => onBlur("price_kwd")}
            />
            <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm text-muted-foreground">د.ك</span>
          </div>
          <Err name="price_kwd" />
        </section>
      )}

      {form.pricing_type === "range" && (
        <section>
          <label className={labelCls}>السعر المتوقع *</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1 block text-xs text-muted-foreground">من</span>
              <input
                className={cls("price_kwd")}
                inputMode="decimal"
                value={form.price_kwd}
                onChange={(e) => onChange({ price_kwd: e.target.value })}
                onBlur={() => onBlur("price_kwd")}
              />
              <Err name="price_kwd" />
            </div>
            <div>
              <span className="mb-1 block text-xs text-muted-foreground">إلى</span>
              <input
                className={cls("price_max_kwd")}
                inputMode="decimal"
                value={form.price_max_kwd}
                onChange={(e) => onChange({ price_max_kwd: e.target.value })}
                onBlur={() => onBlur("price_max_kwd")}
              />
              <Err name="price_max_kwd" />
            </div>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">خلي النطاق دقيق قدر الإمكان — الحد الأعلى لا يزيد عن 30% عن الأدنى.</p>
        </section>
      )}

      {form.pricing_type === "conditional" && (
        <section className="flex flex-col gap-3">
          <div>
            <label className={labelCls}>ما المشكلة المتوقعة؟ *</label>
            <textarea
              className={cls("assumed_diagnosis")}
              rows={2}
              placeholder="مثال: الأقرب كمبروسر المكيف"
              value={form.assumed_diagnosis}
              onChange={(e) => onChange({ assumed_diagnosis: e.target.value })}
              onBlur={() => onBlur("assumed_diagnosis")}
              maxLength={300}
            />
            <Err name="assumed_diagnosis" />
          </div>
          <div>
            <label className={labelCls}>السعر إذا كان التشخيص كما توقعت *</label>
            <input
              className={cls("price_kwd")}
              inputMode="decimal"
              value={form.price_kwd}
              onChange={(e) => onChange({ price_kwd: e.target.value })}
              onBlur={() => onBlur("price_kwd")}
            />
            <Err name="price_kwd" />
          </div>
          <div>
            <label className={labelCls}>رسم الفحص إذا لم يصلح العميل عندك *</label>
            <input
              className={cls("inspection_fee_kwd")}
              inputMode="decimal"
              value={form.inspection_fee_kwd}
              onChange={(e) => onChange({ inspection_fee_kwd: e.target.value })}
              onBlur={() => onBlur("inspection_fee_kwd")}
            />
            <p className="mt-1 text-xs text-muted-foreground">اكتب 0 إذا كان الفحص مجانيًا.</p>
            <Err name="inspection_fee_kwd" />
          </div>
        </section>
      )}

      <section>
        <label className={labelCls}>قطع الغيار المستخدمة *</label>
        <select
          className={cls("parts_type")}
          value={form.parts_type}
          onChange={(e) => onChange({ parts_type: e.target.value })}
          onBlur={() => onBlur("parts_type")}
        >
          <option value="">اختر نوع القطع</option>
          {PARTS_TYPES.map((p) => (
            <option key={p} value={p}>{t(`offers.partsLabel.${p}`)}</option>
          ))}
        </select>
        <Err name="parts_type" />
      </section>

      <section className="rounded-xl border border-border p-4">
        <label className={labelCls}>الضمان بعد التصليح *</label>
        <span className="mb-2 block text-xs text-muted-foreground">مدة الضمان</span>
        <div className="flex flex-wrap gap-2">
          {WARRANTY_PRESETS.map((days) => (
            <button
              key={days}
              type="button"
              className={choiceClass(form.warranty_days === String(days))}
              onClick={() => onChange({ warranty_days: String(days) })}
            >
              {days === 180 ? "6 شهور" : days === 365 ? "سنة" : `${days} يوم`}
            </button>
          ))}
          <button
            type="button"
            className={choiceClass(customWarranty)}
            onClick={() => onChange({ warranty_days: customWarranty ? form.warranty_days : "" })}
          >
            مدة أخرى
          </button>
        </div>
        {!presetWarranty && (
          <div className="mt-3">
            <label className={labelCls}>مدة الضمان بالأيام</label>
            <input
              className={cls("warranty_days")}
              inputMode="numeric"
              placeholder={`الحد الأدنى ${MIN_WARRANTY_DAYS} أيام`}
              value={form.warranty_days}
              onChange={(e) => onChange({ warranty_days: e.target.value })}
              onBlur={() => onBlur("warranty_days")}
            />
            <Err name="warranty_days" />
          </div>
        )}
        {presetWarranty && <Err name="warranty_days" />}
        <div className="mt-4">
          <label className={labelCls}>الضمان يشمل</label>
          <input
            className={inputCls}
            placeholder="مثال: القطعة والتركيب لنفس العطل"
            value={form.warranty_note}
            onChange={(e) => onChange({ warranty_note: e.target.value })}
            maxLength={300}
          />
        </div>
      </section>

      <section>
        <label className={labelCls}>أقصى مدة متوقعة لإصلاح السيارة</label>
        <p className="mb-2 text-xs text-muted-foreground">من وقت دخول السيارة للكراج.</p>
        <select
          className={inputCls}
          value={form.estimated_duration}
          onChange={(e) => onChange({ estimated_duration: e.target.value })}
        >
          <option value="">اختر أقصى مدة متوقعة</option>
          {DURATION_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </section>

      <section className="rounded-lg border border-border bg-background/50 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold">
            {form.validity_days === String(DEFAULT_VALIDITY_DAYS)
              ? `العرض صالح لمدة ${DEFAULT_VALIDITY_DAYS} أيام`
              : `صلاحية العرض: ${form.validity_days} يوم`}
          </span>
          <button
            type="button"
            className="text-sm font-bold text-[#FFD60A]"
            onClick={() => setShowValidity((v) => !v)}
          >
            تغيير
          </button>
        </div>
        {showValidity && (
          <div className="mt-3">
            <label className={labelCls}>صلاحية العرض بالأيام</label>
            <input
              className={cls("validity_days")}
              inputMode="numeric"
              value={form.validity_days}
              onChange={(e) => onChange({ validity_days: e.target.value })}
              onBlur={() => onBlur("validity_days")}
            />
            <Err name="validity_days" />
          </div>
        )}
      </section>

      {!showNotes ? (
        <button
          type="button"
          className="self-start text-sm font-bold text-[#FFD60A]"
          onClick={() => setShowNotes(true)}
        >
          + إضافة ملاحظة
        </button>
      ) : (
        <div>
          <label className={labelCls}>ملاحظات إضافية</label>
          <textarea
            className={inputCls}
            rows={2}
            value={form.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            maxLength={500}
          />
        </div>
      )}
    </>
  );
}
