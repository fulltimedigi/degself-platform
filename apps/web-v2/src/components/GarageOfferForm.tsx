"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  DEFAULT_VALIDITY_DAYS,
  MIN_WARRANTY_DAYS,
  PARTS_TYPES,
  PRICING_TYPES,
} from "@/lib/quote-status";
import { validateOffer, type OfferErrors } from "@/lib/offer-validation";
import { track } from "@/lib/track";

function initialForm(workshopName?: string, workshopPhone?: string) {
  return {
    workshop_name: workshopName ?? "",
    workshop_phone: workshopPhone ?? "",
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
}

const COPY = {
  ar: {
    pricingQuestion: "كيف تحسب السعر؟",
    pricingFixed: "سعر نهائي",
    pricingRange: "من — إلى",
    pricingConditional: "السعر بعد الفحص",
    fixedPrice: "السعر النهائي",
    rangePrice: "السعر المتوقع",
    from: "من",
    to: "إلى",
    currency: "د.ك",
    rangeHint: "خلي النطاق دقيق قدر الإمكان — الحد الأعلى لا يزيد عن 30% عن الأدنى.",
    diagnosis: "ما المشكلة المتوقعة؟",
    diagnosisHint: "مثال: الأقرب كمبروسر المكيف",
    conditionalPrice: "السعر إذا كان التشخيص كما توقعت",
    inspectionFee: "رسم الفحص إذا لم يصلح العميل عندك",
    inspectionHint: "اكتب 0 إذا كان الفحص مجانيًا.",
    parts: "قطع الغيار المستخدمة",
    partsPlaceholder: "اختر نوع القطع",
    warrantyTitle: "الضمان بعد التصليح",
    warrantyDuration: "مدة الضمان",
    warrantyCustom: "مدة أخرى",
    warrantyIncludes: "الضمان يشمل",
    warrantyIncludesHint: "مثال: القطعة والتركيب لنفس العطل",
    duration: "أقصى مدة متوقعة لإصلاح السيارة",
    durationHint: "من وقت دخول السيارة للكراج.",
    durationPlaceholder: "اختر أقصى مدة متوقعة",
    durationSameDay: "نفس اليوم",
    durationOneDay: "يوم",
    durationTwoDays: "يومان",
    durationThreeDays: "3 أيام",
    durationWeek: "4–7 أيام",
    durationLong: "أكثر من أسبوع",
    durationUnknown: "غير معروف حتى الفحص",
    validity: `العرض صالح لمدة ${DEFAULT_VALIDITY_DAYS} أيام`,
    validityChange: "تغيير",
    validityLabel: "صلاحية العرض بالأيام",
    notesAdd: "+ إضافة ملاحظة",
    notes: "ملاحظات إضافية",
    boundGarage: "العرض باسم",
    legacyName: "اسم الكراج",
    legacyPhone: "رقم هاتف الكراج",
  },
  en: {
    pricingQuestion: "How is this price calculated?",
    pricingFixed: "Final price",
    pricingRange: "Price range",
    pricingConditional: "Price after inspection",
    fixedPrice: "Final price",
    rangePrice: "Expected price",
    from: "From",
    to: "To",
    currency: "KWD",
    rangeHint: "Keep the range tight — the maximum can be up to 30% above the minimum.",
    diagnosis: "What do you expect the problem to be?",
    diagnosisHint: "Example: likely the A/C compressor",
    conditionalPrice: "Price if your expected diagnosis is correct",
    inspectionFee: "Inspection fee if the customer does not repair with you",
    inspectionHint: "Enter 0 if inspection is free.",
    parts: "Parts to be used",
    partsPlaceholder: "Choose parts type",
    warrantyTitle: "Repair warranty",
    warrantyDuration: "Warranty period",
    warrantyCustom: "Other",
    warrantyIncludes: "Warranty covers",
    warrantyIncludesHint: "Example: part and installation for the same fault",
    duration: "Maximum expected repair time",
    durationHint: "From the time the vehicle enters the garage.",
    durationPlaceholder: "Choose maximum expected time",
    durationSameDay: "Same day",
    durationOneDay: "1 day",
    durationTwoDays: "2 days",
    durationThreeDays: "3 days",
    durationWeek: "4–7 days",
    durationLong: "More than a week",
    durationUnknown: "Unknown until inspection",
    validity: `Offer valid for ${DEFAULT_VALIDITY_DAYS} days`,
    validityChange: "Change",
    validityLabel: "Offer validity in days",
    notesAdd: "+ Add a note",
    notes: "Additional notes",
    boundGarage: "Offer from",
    legacyName: "Garage name",
    legacyPhone: "Garage phone",
  },
  hi: {
    pricingQuestion: "कीमत कैसे तय है?",
    pricingFixed: "अंतिम कीमत",
    pricingRange: "कीमत की सीमा",
    pricingConditional: "जांच के बाद कीमत",
    fixedPrice: "अंतिम कीमत",
    rangePrice: "अनुमानित कीमत",
    from: "से",
    to: "तक",
    currency: "KWD",
    rangeHint: "सीमा यथासंभव सटीक रखें — अधिकतम कीमत न्यूनतम से 30% से ज्यादा न हो।",
    diagnosis: "आपके अनुसार संभावित समस्या क्या है?",
    diagnosisHint: "उदाहरण: संभवतः A/C कम्प्रेसर",
    conditionalPrice: "अगर अनुमानित खराबी सही हो तो कीमत",
    inspectionFee: "अगर ग्राहक मरम्मत न कराए तो जांच शुल्क",
    inspectionHint: "जांच मुफ्त हो तो 0 लिखें।",
    parts: "इस्तेमाल होने वाले पार्ट्स",
    partsPlaceholder: "पार्ट्स का प्रकार चुनें",
    warrantyTitle: "मरम्मत की वारंटी",
    warrantyDuration: "वारंटी अवधि",
    warrantyCustom: "अन्य",
    warrantyIncludes: "वारंटी में शामिल",
    warrantyIncludesHint: "उदाहरण: उसी खराबी के लिए पार्ट और फिटिंग",
    duration: "मरम्मत में अधिकतम अनुमानित समय",
    durationHint: "गाड़ी के गैरेज में आने के समय से।",
    durationPlaceholder: "अधिकतम समय चुनें",
    durationSameDay: "उसी दिन",
    durationOneDay: "1 दिन",
    durationTwoDays: "2 दिन",
    durationThreeDays: "3 दिन",
    durationWeek: "4–7 दिन",
    durationLong: "एक हफ्ते से ज्यादा",
    durationUnknown: "जांच तक पता नहीं",
    validity: `ऑफर ${DEFAULT_VALIDITY_DAYS} दिन के लिए मान्य`,
    validityChange: "बदलें",
    validityLabel: "ऑफर की वैधता (दिन)",
    notesAdd: "+ नोट जोड़ें",
    notes: "अतिरिक्त नोट",
    boundGarage: "ऑफर देने वाला गैरेज",
    legacyName: "गैरेज का नाम",
    legacyPhone: "गैरेज फोन",
  },
  ur: {
    pricingQuestion: "قیمت کیسے طے کی گئی ہے؟",
    pricingFixed: "حتمی قیمت",
    pricingRange: "قیمت کی حد",
    pricingConditional: "معائنے کے بعد قیمت",
    fixedPrice: "حتمی قیمت",
    rangePrice: "متوقع قیمت",
    from: "سے",
    to: "تک",
    currency: "د.ک",
    rangeHint: "حد کو ممکن حد تک درست رکھیں — زیادہ سے زیادہ قیمت کم از کم سے 30% سے زیادہ نہ ہو۔",
    diagnosis: "آپ کے خیال میں ممکنہ خرابی کیا ہے؟",
    diagnosisHint: "مثال: غالباً اے سی کمپریسر",
    conditionalPrice: "اگر متوقع تشخیص درست ہو تو قیمت",
    inspectionFee: "اگر گاہک مرمت نہ کروائے تو معائنہ فیس",
    inspectionHint: "معائنہ مفت ہو تو 0 لکھیں۔",
    parts: "استعمال ہونے والے پرزے",
    partsPlaceholder: "پرزوں کی قسم منتخب کریں",
    warrantyTitle: "مرمت کی وارنٹی",
    warrantyDuration: "وارنٹی کی مدت",
    warrantyCustom: "دوسری مدت",
    warrantyIncludes: "وارنٹی میں شامل ہے",
    warrantyIncludesHint: "مثال: اسی خرابی کے لیے پرزہ اور تنصیب",
    duration: "گاڑی کی مرمت کی زیادہ سے زیادہ متوقع مدت",
    durationHint: "گاڑی کے گیراج میں داخل ہونے کے وقت سے۔",
    durationPlaceholder: "زیادہ سے زیادہ مدت منتخب کریں",
    durationSameDay: "اسی دن",
    durationOneDay: "1 دن",
    durationTwoDays: "2 دن",
    durationThreeDays: "3 دن",
    durationWeek: "4–7 دن",
    durationLong: "ایک ہفتے سے زیادہ",
    durationUnknown: "معائنے تک معلوم نہیں",
    validity: `آفر ${DEFAULT_VALIDITY_DAYS} دن کے لیے کارآمد ہے`,
    validityChange: "تبدیل کریں",
    validityLabel: "آفر کی مدت (دن)",
    notesAdd: "+ نوٹ شامل کریں",
    notes: "اضافی نوٹ",
    boundGarage: "آفر کی طرف سے",
    legacyName: "گیراج کا نام",
    legacyPhone: "گیراج فون",
  },
} as const;

type CopyLocale = keyof typeof COPY;

const WARRANTY_PRESETS = [7, 30, 90, 180, 365] as const;
const DURATION_OPTIONS = [
  ["same_day", "durationSameDay"],
  ["1_day", "durationOneDay"],
  ["2_days", "durationTwoDays"],
  ["3_days", "durationThreeDays"],
  ["4_7_days", "durationWeek"],
  ["over_week", "durationLong"],
  ["unknown_until_inspection", "durationUnknown"],
] as const;

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-3 text-base focus:border-[#FFD60A] focus:outline-none";
const labelCls = "mb-1.5 block text-sm font-extrabold";

export function GarageOfferForm({
  token,
  workshopName,
  workshopPhone,
}: {
  token: string;
  workshopName?: string;
  workshopPhone?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const c = COPY[(locale in COPY ? locale : "ar") as CopyLocale];
  const boundIdentity = Boolean(workshopName);
  const [form, setForm] = useState(() => initialForm(workshopName, workshopPhone));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [done, setDone] = useState(false);
  const [showValidity, setShowValidity] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const presetWarranty = WARRANTY_PRESETS.includes(Number(form.warranty_days) as (typeof WARRANTY_PRESETS)[number]);
  const customWarranty = Boolean(form.warranty_days) && !presetWarranty;

  useEffect(() => {
    void fetch(`/api/garage-outreach/${encodeURIComponent(token)}/open`, {
      method: "POST",
      keepalive: true,
    }).catch(() => undefined);
  }, [token]);

  const errs: OfferErrors = useMemo(() => validateOffer(form).errors ?? {}, [form]);
  const hasErrors = Object.keys(errs).length > 0;

  const set = (patch: Partial<typeof form>) => {
    setForm((f) => ({
      ...f,
      ...patch,
      ...(boundIdentity
        ? {
            workshop_name: workshopName ?? f.workshop_name,
            workshop_phone: workshopPhone ?? f.workshop_phone,
          }
        : {}),
    }));
  };
  const mark = (name: string) => setTouched((prev) => ({ ...prev, [name]: true }));
  const showErr = (name: keyof OfferErrors) =>
    touched[name as string] || attempted ? errs[name] : undefined;
  const Err = ({ name }: { name: keyof OfferErrors }) => {
    const err = showErr(name);
    return err ? <p className="mt-1 text-xs font-bold text-red-400">{err}</p> : null;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    const res = validateOffer(form);
    if (res.errors) {
      setMsg({ kind: "err", text: Object.values(res.errors)[0] ?? t("submit.completeFields") });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/submit-offer/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg({ kind: "err", text: d.error ?? t("submit.sendError") });
        return;
      }
      track("garage_offer_submit", { locale, success: true, surface: "garage_offer_form" });
      setDone(true);
    } catch {
      setMsg({ kind: "err", text: t("offers.connError") });
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border-2 border-[#FFD60A] bg-card p-8 text-center">
        <p className="mb-3 text-4xl">✅</p>
        <p className="mb-2 text-lg font-extrabold">{t("submit.doneTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("submit.doneBody")}</p>
      </div>
    );
  }

  const choiceClass = (active: boolean) =>
    `rounded-lg border px-3 py-2.5 text-sm font-bold transition ${
      active ? "border-[#FFD60A] bg-[#FFD60A] text-[#0A0A0A]" : "border-border bg-background"
    }`;

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5" noValidate>
      {boundIdentity && workshopName ? (
        <div className="rounded-lg border border-[#FFD60A]/40 bg-[#FFD60A]/5 p-3 text-sm">
          <span className="text-muted-foreground">{c.boundGarage}: </span>
          <strong>{workshopName}</strong>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>{c.legacyName}</label>
            <input className={inputCls} value={form.workshop_name} onChange={(e) => set({ workshop_name: e.target.value })} onBlur={() => mark("workshop_name")} maxLength={120} />
            <Err name="workshop_name" />
          </div>
          <div>
            <label className={labelCls}>{c.legacyPhone}</label>
            <input className={inputCls} dir="ltr" value={form.workshop_phone} onChange={(e) => set({ workshop_phone: e.target.value })} maxLength={20} />
          </div>
        </div>
      )}

      <section>
        <label className={labelCls}>{c.pricingQuestion} *</label>
        <div className="grid grid-cols-3 gap-2">
          {PRICING_TYPES.map((opt) => {
            const label = opt === "fixed" ? c.pricingFixed : opt === "range" ? c.pricingRange : c.pricingConditional;
            return (
              <button key={opt} type="button" className={choiceClass(form.pricing_type === opt)} onClick={() => set({ pricing_type: opt, price_kwd: "", price_max_kwd: "", assumed_diagnosis: "", inspection_fee_kwd: "" })}>
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {form.pricing_type === "fixed" && (
        <section>
          <label className={labelCls}>{c.fixedPrice} *</label>
          <div className="relative">
            <input className={inputCls} inputMode="decimal" value={form.price_kwd} onChange={(e) => set({ price_kwd: e.target.value })} onBlur={() => mark("price_kwd")} />
            <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm text-muted-foreground">{c.currency}</span>
          </div>
          <Err name="price_kwd" />
        </section>
      )}

      {form.pricing_type === "range" && (
        <section>
          <label className={labelCls}>{c.rangePrice} *</label>
          <div className="grid grid-cols-2 gap-3">
            <div><span className="mb-1 block text-xs text-muted-foreground">{c.from}</span><input className={inputCls} inputMode="decimal" value={form.price_kwd} onChange={(e) => set({ price_kwd: e.target.value })} onBlur={() => mark("price_kwd")} /><Err name="price_kwd" /></div>
            <div><span className="mb-1 block text-xs text-muted-foreground">{c.to}</span><input className={inputCls} inputMode="decimal" value={form.price_max_kwd} onChange={(e) => set({ price_max_kwd: e.target.value })} onBlur={() => mark("price_max_kwd")} /><Err name="price_max_kwd" /></div>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{c.rangeHint}</p>
        </section>
      )}

      {form.pricing_type === "conditional" && (
        <section className="flex flex-col gap-3">
          <div><label className={labelCls}>{c.diagnosis} *</label><textarea className={inputCls} rows={2} placeholder={c.diagnosisHint} value={form.assumed_diagnosis} onChange={(e) => set({ assumed_diagnosis: e.target.value })} onBlur={() => mark("assumed_diagnosis")} maxLength={300} /><Err name="assumed_diagnosis" /></div>
          <div><label className={labelCls}>{c.conditionalPrice} *</label><input className={inputCls} inputMode="decimal" value={form.price_kwd} onChange={(e) => set({ price_kwd: e.target.value })} onBlur={() => mark("price_kwd")} /><Err name="price_kwd" /></div>
          <div><label className={labelCls}>{c.inspectionFee} *</label><input className={inputCls} inputMode="decimal" value={form.inspection_fee_kwd} onChange={(e) => set({ inspection_fee_kwd: e.target.value })} onBlur={() => mark("inspection_fee_kwd")} /><p className="mt-1 text-xs text-muted-foreground">{c.inspectionHint}</p><Err name="inspection_fee_kwd" /></div>
        </section>
      )}

      <section>
        <label className={labelCls}>{c.parts} *</label>
        <select className={inputCls} value={form.parts_type} onChange={(e) => set({ parts_type: e.target.value })} onBlur={() => mark("parts_type")}>
          <option value="">{c.partsPlaceholder}</option>
          {PARTS_TYPES.map((p) => <option key={p} value={p}>{t(`offers.partsLabel.${p}`)}</option>)}
        </select>
        <Err name="parts_type" />
      </section>

      <section className="rounded-xl border border-border p-4">
        <label className={labelCls}>{c.warrantyTitle} *</label>
        <span className="mb-2 block text-xs text-muted-foreground">{c.warrantyDuration}</span>
        <div className="flex flex-wrap gap-2">
          {WARRANTY_PRESETS.map((days) => (
            <button key={days} type="button" className={choiceClass(form.warranty_days === String(days))} onClick={() => set({ warranty_days: String(days) })}>
              {days === 180 ? "6" : days === 365 ? "1" : days} {days === 180 ? (locale === "ar" ? "شهور" : locale === "ur" ? "ماہ" : locale === "hi" ? "महीने" : "months") : days === 365 ? (locale === "ar" ? "سنة" : locale === "ur" ? "سال" : locale === "hi" ? "साल" : "year") : (locale === "ar" ? "يوم" : locale === "ur" ? "دن" : locale === "hi" ? "दिन" : "days")}
            </button>
          ))}
          <button type="button" className={choiceClass(customWarranty)} onClick={() => set({ warranty_days: customWarranty ? form.warranty_days : "" })}>{c.warrantyCustom}</button>
        </div>
        {!presetWarranty && (
          <div className="mt-3"><input className={inputCls} inputMode="numeric" placeholder={`${c.warrantyDuration} (≥ ${MIN_WARRANTY_DAYS})`} value={form.warranty_days} onChange={(e) => set({ warranty_days: e.target.value })} onBlur={() => mark("warranty_days")} /><Err name="warranty_days" /></div>
        )}
        {presetWarranty && <Err name="warranty_days" />}
        <div className="mt-4"><label className={labelCls}>{c.warrantyIncludes}</label><input className={inputCls} placeholder={c.warrantyIncludesHint} value={form.warranty_note} onChange={(e) => set({ warranty_note: e.target.value })} maxLength={300} /></div>
      </section>

      <section>
        <label className={labelCls}>{c.duration}</label>
        <p className="mb-2 text-xs text-muted-foreground">{c.durationHint}</p>
        <select className={inputCls} value={form.estimated_duration} onChange={(e) => set({ estimated_duration: e.target.value })}>
          <option value="">{c.durationPlaceholder}</option>
          {DURATION_OPTIONS.map(([value, key]) => <option key={value} value={value}>{c[key]}</option>)}
        </select>
      </section>

      <section className="rounded-lg border border-border bg-background/50 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold">{form.validity_days === String(DEFAULT_VALIDITY_DAYS) ? c.validity : `${c.validityLabel}: ${form.validity_days}`}</span>
          <button type="button" className="text-sm font-bold text-[#FFD60A]" onClick={() => setShowValidity((v) => !v)}>{c.validityChange}</button>
        </div>
        {showValidity && <div className="mt-3"><label className={labelCls}>{c.validityLabel}</label><input className={inputCls} inputMode="numeric" value={form.validity_days} onChange={(e) => set({ validity_days: e.target.value })} onBlur={() => mark("validity_days")} /><Err name="validity_days" /></div>}
      </section>

      {!showNotes ? (
        <button type="button" className="self-start text-sm font-bold text-[#FFD60A]" onClick={() => setShowNotes(true)}>{c.notesAdd}</button>
      ) : (
        <div><label className={labelCls}>{c.notes}</label><textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={500} /></div>
      )}

      {msg && <div className={`rounded-lg border p-3 text-sm ${msg.kind === "ok" ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-red-500/40 bg-red-500/10 text-red-400"}`}>{msg.text}</div>}

      <button type="submit" disabled={busy || hasErrors} className="mt-1 rounded-lg bg-[#FFD60A] px-4 py-3.5 text-base font-extrabold text-[#0A0A0A] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60">
        {busy ? t("submit.submitting") : hasErrors ? t("submit.completeFields") : t("submit.submit")}
      </button>
    </form>
  );
}
