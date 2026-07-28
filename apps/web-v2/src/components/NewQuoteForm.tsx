"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/track";

// Service categories. `value` is the Arabic-canonical string that is SUBMITTED
// (the founder reads it when routing manually), while the visible label is
// translated per locale — so a Hindi/English user still submits a value the
// founder can act on.
const SERVICES: { key: string; value: string }[] = [
  { key: "mechanics", value: "ميكانيكا ومكينة (توضيب، تجفيت، زيوت)" },
  { key: "gearbox", value: "قير / جير (تصليح، تجفيت، برمجة)" },
  { key: "electrical", value: "كهرباء وكمبيوتر السيارة" },
  { key: "ac", value: "تكييف وفريون" },
  { key: "suspension", value: "هيئة أمامية ومساعدات (مقصات، ميزان، دعاميات)" },
  { key: "brakes", value: "فرامل (تيل، دسكات، ABS)" },
  { key: "tires", value: "بنشر وتواير وبطاريات" },
  { key: "bodywork", value: "حدادة وصبغ (سمكرة وحوادث)" },
  { key: "exhaust", value: "إكسوز / شكمان (فم)" },
  { key: "detailing", value: "ديتيلنج وتلميع وحماية (PPF، تظليل)" },
  { key: "towing", value: "ونش / سطحة" },
  { key: "mobile", value: "خدمة متنقلة عند البيت" },
  { key: "other", value: "خدمة أخرى (اكتبها في وصف المشكلة)" },
];

// Governorates — submitted value stays Arabic-canonical; label translated.
const AREAS: { key: string; value: string }[] = [
  { key: "capital", value: "العاصمة" },
  { key: "hawalli", value: "حولي" },
  { key: "farwaniya", value: "الفروانية" },
  { key: "ahmadi", value: "الأحمدي" },
  { key: "jahra", value: "الجهراء" },
  { key: "mubarak", value: "مبارك الكبير" },
];

// Kuwait has many classics/older models — cover 1980→2026, newest first.
const YEARS = Array.from({ length: 2026 - 1980 + 1 }, (_, i) => String(2026 - i));

// Urgency — server validates the Arabic value, so that stays canonical.
const URGENCIES: { key: string; value: string }[] = [
  { key: "normal", value: "عادي" },
  { key: "urgent", value: "مستعجل" },
  { key: "emergency", value: "طارئ" },
];

export function NewQuoteForm({ initialService = "" }: { initialService?: string }) {
  const t = useTranslations("quote");
  const serviceIsKnown = SERVICES.some((s) => s.value === initialService);
  const [service, setService] = useState(serviceIsKnown ? initialService : "");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState("");
  const [problem, setProblem] = useState("");
  const [area, setArea] = useState("");
  const [urgency, setUrgency] = useState("عادي");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [quoteId, setQuoteId] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (customerName.trim().length < 2) return setError(t("errName"));
    if (!/^\d{8}$/.test(customerPhone.trim())) return setError(t("errPhone"));
    if (!service) return setError(t("errService"));
    if (problem.trim().length < 10) return setError(t("errProblem"));
    if (!carMake.trim()) return setError(t("errCarMake"));
    if (!carModel.trim()) return setError(t("errCarModel"));
    if (!carYear) return setError(t("errCarYear"));

    setStatus("sending");
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          service,
          car_make: carMake,
          car_model: carModel,
          car_year: carYear,
          problem_description: problem,
          area,
          urgency,
          source: "quote_bar",
          website,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? t("errSend"));
        return;
      }
      track("quote_submit", { service });
      setQuoteId(data.id ?? "");
      setStatus("done");
    } catch {
      setStatus("error");
      setError(t("errConn"));
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border-2 border-[#FFD60A] bg-[#0A0A0A] p-6 text-center text-white">
        <p className="mb-3 text-lg font-extrabold">{t("doneTitle")}</p>
        {quoteId && (
          <p className="mb-3 text-sm text-gray-300">
            {t("doneId")}{" "}
            <span dir="ltr" className="font-mono text-[#FFD60A]">
              {quoteId}
            </span>
          </p>
        )}
        <p className="text-sm text-gray-300">{t("doneBody")}</p>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-border bg-card px-3 py-3 text-base focus:border-[#FFD60A] focus:outline-none";
  const labelCls = "mb-1 block text-sm font-bold";
  const req = <span className="text-red-500">*</span>;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {/* honeypot — hidden from users, bots fill it */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
      />

      <div>
        <label className={labelCls}>
          {t("serviceLabel")} {req}
        </label>
        <select value={service} onChange={(e) => setService(e.target.value)} className={inputCls}>
          <option value="">{t("servicePlaceholder")}</option>
          {SERVICES.map((s) => (
            <option key={s.key} value={s.value}>
              {t(`services.${s.key}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>
          {t("problemLabel")} {req}
        </label>
        <textarea
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder={t("problemPlaceholder")}
          className={inputCls}
          rows={4}
          maxLength={1000}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>
            {t("carMakeLabel")} {req}
          </label>
          <input
            type="text"
            value={carMake}
            onChange={(e) => setCarMake(e.target.value)}
            placeholder={t("carMakePlaceholder")}
            className={inputCls}
            maxLength={60}
          />
        </div>
        <div>
          <label className={labelCls}>
            {t("carModelLabel")} {req}
          </label>
          <input
            type="text"
            value={carModel}
            onChange={(e) => setCarModel(e.target.value)}
            placeholder={t("carModelPlaceholder")}
            className={inputCls}
            maxLength={60}
          />
        </div>
        <div>
          <label className={labelCls}>
            {t("carYearLabel")} {req}
          </label>
          <select value={carYear} onChange={(e) => setCarYear(e.target.value)} className={inputCls}>
            <option value="">{t("yearPlaceholder")}</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>{t("areaLabel")}</label>
        <select value={area} onChange={(e) => setArea(e.target.value)} className={inputCls}>
          <option value="">{t("areaAny")}</option>
          {AREAS.map((a) => (
            <option key={a.key} value={a.value}>
              {t(`areas.${a.key}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className={labelCls}>{t("urgencyLabel")}</span>
        <div className="grid grid-cols-3 gap-2">
          {URGENCIES.map((u) => (
            <button
              type="button"
              key={u.key}
              onClick={() => setUrgency(u.value)}
              className={`rounded-lg border py-2 text-sm font-bold transition ${
                urgency === u.value
                  ? "border-[#FFD60A] bg-[#FFD60A] text-[#0A0A0A]"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {t(`urgency.${u.key}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>
            {t("nameLabel")} {req}
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder={t("namePlaceholder")}
            className={inputCls}
            maxLength={60}
          />
        </div>
        <div>
          <label className={labelCls}>
            {t("phoneLabel")} {req}
          </label>
          <input
            type="tel"
            inputMode="numeric"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value.replace(/[^\d]/g, ""))}
            placeholder={t("phonePlaceholder")}
            className={inputCls}
            dir="ltr"
            maxLength={8}
          />
          <p className="mt-1 text-xs text-muted-foreground">{t("phoneNote")}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-lg bg-[#FFD60A] px-4 py-4 text-base font-extrabold text-[#0A0A0A] transition hover:brightness-95 disabled:opacity-60"
      >
        {status === "sending" ? t("submitting") : t("submit")}
      </button>

      <p className="text-center text-xs text-muted-foreground">{t("footerFree")}</p>
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">{t("consent")}</p>
    </form>
  );
}
