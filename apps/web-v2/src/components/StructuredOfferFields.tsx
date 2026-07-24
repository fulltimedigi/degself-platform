"use client";

import {
  PARTS_TYPES,
  PARTS_TYPE_LABEL,
  PRICING_TYPES,
  PRICING_TYPE_META,
  MIN_WARRANTY_DAYS,
  type PartsType,
} from "@/lib/quote-status";
import type { OfferErrors } from "@/lib/offer-validation";

// The structured-offer input fields (workshop name → notes), shared by the admin
// add-offer form (QuoteAdminControls) and the public garage form (GarageOfferForm).
// Pure presentation: the parent owns the form state, validation, touched/attempted
// tracking, and the submit button — this only renders inputs + inline errors.
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

const inputCls =
  "w-full rounded-lg border bg-background px-3 py-2.5 text-base focus:outline-none focus:border-[#FFD60A]";

export function StructuredOfferFields({
  form,
  onChange,
  onBlur,
  showError,
}: {
  form: StructuredOfferFormState;
  onChange: (patch: Partial<StructuredOfferFormState>) => void;
  onBlur: (name: string) => void;
  /** Returns the error text to display for a field, or undefined to hide it. */
  showError: (name: keyof OfferErrors) => string | undefined;
}) {
  const cls = (name: keyof OfferErrors) =>
    `${inputCls} ${showError(name) ? "border-red-500 focus:border-red-500" : "border-border"}`;

  function Err({ name }: { name: keyof OfferErrors }) {
    const e = showError(name);
    return e ? <p className="mt-1 text-xs font-bold text-red-400">{e}</p> : null;
  }

  const pt = form.pricing_type;

  return (
    <>
      <div>
        <input
          className={cls("workshop_name")}
          placeholder="اسم الكراج *"
          value={form.workshop_name}
          onChange={(e) => onChange({ workshop_name: e.target.value })}
          onBlur={() => onBlur("workshop_name")}
          maxLength={120}
        />
        <Err name="workshop_name" />
      </div>

      {/* Pricing type */}
      <div>
        <label className="mb-1 block text-xs font-bold text-muted-foreground">نوع التسعير *</label>
        <div className="grid grid-cols-3 gap-2">
          {PRICING_TYPES.map((t) => {
            const active = pt === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onChange({ pricing_type: t })}
                className={`rounded-lg border px-2 py-2 text-xs font-bold transition ${
                  active
                    ? "border-[#FFD60A] bg-[#FFD60A] text-[#0A0A0A]"
                    : "border-border bg-background text-foreground"
                }`}
              >
                {PRICING_TYPE_META[t].label}
              </button>
            );
          })}
        </div>
      </div>

      {pt === "fixed" && (
        <div>
          <input
            className={cls("price_kwd")}
            inputMode="decimal"
            placeholder="السعر الثابت (د.ك) *"
            value={form.price_kwd}
            onChange={(e) => onChange({ price_kwd: e.target.value })}
            onBlur={() => onBlur("price_kwd")}
          />
          <Err name="price_kwd" />
        </div>
      )}

      {pt === "range" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <input
              className={cls("price_kwd")}
              inputMode="decimal"
              placeholder="الحد الأدنى (د.ك) *"
              value={form.price_kwd}
              onChange={(e) => onChange({ price_kwd: e.target.value })}
              onBlur={() => onBlur("price_kwd")}
            />
            <Err name="price_kwd" />
          </div>
          <div>
            <input
              className={cls("price_max_kwd")}
              inputMode="decimal"
              placeholder="الحد الأعلى (د.ك) *"
              value={form.price_max_kwd}
              onChange={(e) => onChange({ price_max_kwd: e.target.value })}
              onBlur={() => onBlur("price_max_kwd")}
            />
            <Err name="price_max_kwd" />
            <p className="mt-1 text-[11px] text-muted-foreground">الحد الأعلى ≤ الأدنى × ١٫٣</p>
          </div>
        </div>
      )}

      {pt === "conditional" && (
        <div className="flex flex-col gap-3">
          <div>
            <textarea
              className={cls("assumed_diagnosis")}
              placeholder="التشخيص المرجّح: بناءً على شرح العميل، الأقرب إن المشكلة… *"
              value={form.assumed_diagnosis}
              onChange={(e) => onChange({ assumed_diagnosis: e.target.value })}
              onBlur={() => onBlur("assumed_diagnosis")}
              rows={2}
              maxLength={300}
            />
            <Err name="assumed_diagnosis" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <input
                className={cls("price_kwd")}
                inputMode="decimal"
                placeholder="السعر المشروط (د.ك) *"
                value={form.price_kwd}
                onChange={(e) => onChange({ price_kwd: e.target.value })}
                onBlur={() => onBlur("price_kwd")}
              />
              <Err name="price_kwd" />
            </div>
            <div>
              <input
                className={cls("inspection_fee_kwd")}
                inputMode="decimal"
                placeholder="رسم الكشف (٠ = مجاني) *"
                value={form.inspection_fee_kwd}
                onChange={(e) => onChange({ inspection_fee_kwd: e.target.value })}
                onBlur={() => onBlur("inspection_fee_kwd")}
              />
              <Err name="inspection_fee_kwd" />
            </div>
          </div>
        </div>
      )}

      {/* Parts type */}
      <div>
        <select
          className={cls("parts_type")}
          value={form.parts_type}
          onChange={(e) => onChange({ parts_type: e.target.value })}
          onBlur={() => onBlur("parts_type")}
        >
          <option value="">نوع قطع الغيار *</option>
          {PARTS_TYPES.map((p) => (
            <option key={p} value={p}>
              {PARTS_TYPE_LABEL[p as PartsType]}
            </option>
          ))}
        </select>
        <Err name="parts_type" />
      </div>

      {/* Validity + warranty */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <input
            className={cls("validity_days")}
            inputMode="numeric"
            placeholder="صلاحية العرض (أيام) *"
            value={form.validity_days}
            onChange={(e) => onChange({ validity_days: e.target.value })}
            onBlur={() => onBlur("validity_days")}
          />
          <Err name="validity_days" />
        </div>
        <div>
          <input
            className={cls("warranty_days")}
            inputMode="numeric"
            placeholder={`الضمان (أيام، ≥ ${MIN_WARRANTY_DAYS}) *`}
            value={form.warranty_days}
            onChange={(e) => onChange({ warranty_days: e.target.value })}
            onBlur={() => onBlur("warranty_days")}
          />
          <Err name="warranty_days" />
        </div>
      </div>

      <input
        className={`${inputCls} border-border`}
        placeholder="نطاق الضمان (اختياري — تفاصيل إضافية)"
        value={form.warranty_note}
        onChange={(e) => onChange({ warranty_note: e.target.value })}
        maxLength={300}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          className={`${inputCls} border-border`}
          placeholder="المدة التقديرية (مثال: ٣ أيام)"
          value={form.estimated_duration}
          onChange={(e) => onChange({ estimated_duration: e.target.value })}
          maxLength={60}
        />
        <input
          className={`${inputCls} border-border`}
          dir="ltr"
          placeholder="هاتف الكراج (اختياري)"
          value={form.workshop_phone}
          onChange={(e) => onChange({ workshop_phone: e.target.value })}
          maxLength={20}
        />
      </div>
      <textarea
        className={`${inputCls} border-border`}
        placeholder="ملاحظات إضافية (اختياري)"
        value={form.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        rows={2}
        maxLength={500}
      />
    </>
  );
}
