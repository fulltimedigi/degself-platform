"use client";

import { useMemo, useState } from "react";
import {
  PARTS_TYPES,
  PARTS_TYPE_LABEL,
  PRICING_TYPES,
  PRICING_TYPE_META,
  DEFAULT_VALIDITY_DAYS,
  MIN_WARRANTY_DAYS,
  type PartsType,
} from "@/lib/quote-status";
import { validateOffer, type OfferErrors } from "@/lib/offer-validation";

const EMPTY = {
  workshop_name: "",
  workshop_phone: "",
  pricing_type: "fixed",
  price_kwd: "",
  price_max_kwd: "",
  assumed_diagnosis: "",
  inspection_fee_kwd: "",
  parts_type: "",
  validity_days: String(DEFAULT_VALIDITY_DAYS),
  warranty_days: "",
  warranty_note: "",
  estimated_duration: "",
  notes: "",
};

const inputCls =
  "w-full rounded-lg border bg-background px-3 py-2.5 text-base focus:outline-none focus:border-[#FFD60A]";

export function GarageOfferForm({ token }: { token: string }) {
  const [form, setForm] = useState({ ...EMPTY });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [done, setDone] = useState(false);

  const errs: OfferErrors = useMemo(() => validateOffer(form).errors ?? {}, [form]);
  const hasErrors = Object.keys(errs).length > 0;

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const mark = (name: string) => setTouched((t) => ({ ...t, [name]: true }));
  const showErr = (name: keyof OfferErrors) =>
    touched[name as string] || attempted ? errs[name] : undefined;
  const cls = (name: keyof OfferErrors) =>
    `${inputCls} ${showErr(name) ? "border-red-500 focus:border-red-500" : "border-border"}`;

  function Err({ name }: { name: keyof OfferErrors }) {
    const e = showErr(name);
    return e ? <p className="mt-1 text-xs font-bold text-red-400">{e}</p> : null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    const res = validateOffer(form);
    if (res.errors) {
      setMsg({ kind: "err", text: Object.values(res.errors)[0] ?? "أكمل الحقول المطلوبة." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/submit-offer/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg({ kind: "err", text: d.error ?? "تعذّر إرسال العرض." });
        return;
      }
      setDone(true);
    } catch {
      setMsg({ kind: "err", text: "تعذّر الاتصال، تأكد من الإنترنت." });
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border-2 border-[#FFD60A] bg-card p-8 text-center">
        <p className="mb-3 text-4xl">✅</p>
        <p className="mb-2 text-lg font-extrabold">تم استلام عرضك</p>
        <p className="text-sm text-muted-foreground">
          وصل عرضك للعميل ضمن العروض. لو اخترك، بيتم التواصل معك.
        </p>
      </div>
    );
  }

  const pt = form.pricing_type;

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <div>
        <input
          className={cls("workshop_name")}
          placeholder="اسم الكراج *"
          value={form.workshop_name}
          onChange={(e) => set({ workshop_name: e.target.value })}
          onBlur={() => mark("workshop_name")}
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
                onClick={() => set({ pricing_type: t })}
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
            onChange={(e) => set({ price_kwd: e.target.value })}
            onBlur={() => mark("price_kwd")}
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
              onChange={(e) => set({ price_kwd: e.target.value })}
              onBlur={() => mark("price_kwd")}
            />
            <Err name="price_kwd" />
          </div>
          <div>
            <input
              className={cls("price_max_kwd")}
              inputMode="decimal"
              placeholder="الحد الأعلى (د.ك) *"
              value={form.price_max_kwd}
              onChange={(e) => set({ price_max_kwd: e.target.value })}
              onBlur={() => mark("price_max_kwd")}
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
              onChange={(e) => set({ assumed_diagnosis: e.target.value })}
              onBlur={() => mark("assumed_diagnosis")}
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
                onChange={(e) => set({ price_kwd: e.target.value })}
                onBlur={() => mark("price_kwd")}
              />
              <Err name="price_kwd" />
            </div>
            <div>
              <input
                className={cls("inspection_fee_kwd")}
                inputMode="decimal"
                placeholder="رسم الكشف (٠ = مجاني) *"
                value={form.inspection_fee_kwd}
                onChange={(e) => set({ inspection_fee_kwd: e.target.value })}
                onBlur={() => mark("inspection_fee_kwd")}
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
          onChange={(e) => set({ parts_type: e.target.value })}
          onBlur={() => mark("parts_type")}
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
            onChange={(e) => set({ validity_days: e.target.value })}
            onBlur={() => mark("validity_days")}
          />
          <Err name="validity_days" />
        </div>
        <div>
          <input
            className={cls("warranty_days")}
            inputMode="numeric"
            placeholder={`الضمان (أيام، ≥ ${MIN_WARRANTY_DAYS}) *`}
            value={form.warranty_days}
            onChange={(e) => set({ warranty_days: e.target.value })}
            onBlur={() => mark("warranty_days")}
          />
          <Err name="warranty_days" />
        </div>
      </div>

      <input
        className={`${inputCls} border-border`}
        placeholder="نطاق الضمان (اختياري — تفاصيل إضافية)"
        value={form.warranty_note}
        onChange={(e) => set({ warranty_note: e.target.value })}
        maxLength={300}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          className={`${inputCls} border-border`}
          placeholder="المدة التقديرية (مثال: ٣ أيام)"
          value={form.estimated_duration}
          onChange={(e) => set({ estimated_duration: e.target.value })}
          maxLength={60}
        />
        <input
          className={`${inputCls} border-border`}
          dir="ltr"
          placeholder="هاتف الكراج (اختياري)"
          value={form.workshop_phone}
          onChange={(e) => set({ workshop_phone: e.target.value })}
          maxLength={20}
        />
      </div>
      <textarea
        className={`${inputCls} border-border`}
        placeholder="ملاحظات إضافية (اختياري)"
        value={form.notes}
        onChange={(e) => set({ notes: e.target.value })}
        rows={2}
        maxLength={500}
      />

      {msg && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            msg.kind === "ok"
              ? "border-green-500/40 bg-green-500/10 text-green-400"
              : "border-red-500/40 bg-red-500/10 text-red-400"
          }`}
        >
          {msg.text}
        </div>
      )}

      <button
        type="submit"
        disabled={busy || hasErrors}
        className="mt-1 rounded-lg bg-[#FFD60A] px-4 py-3.5 text-base font-extrabold text-[#0A0A0A] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "جارٍ الإرسال..." : hasErrors ? "أكمل الحقول المطلوبة" : "إرسال العرض"}
      </button>
    </form>
  );
}
