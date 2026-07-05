"use client";

import { useState } from "react";
import { track } from "@/lib/track";

// Labels are the colloquial terms drivers use; VALUES are the real
// reviewed_specialty values so garage matching stays clean (عفشة/توجيه/ديزل map
// to their parent specialty — the manual router reads the description for nuance).
const SERVICES: { label: string; value: string }[] = [
  { label: "تكييف", value: "تكييف" },
  { label: "قير / فتيس", value: "قير وفتيس" },
  { label: "مكينة / محرك", value: "ميكانيكا" },
  { label: "فرامل / بريكات", value: "فرامل" },
  { label: "كهرباء", value: "كهرباء سيارات" },
  { label: "بودي وصبغ / سمكرة", value: "بودي وصبغ" },
  { label: "عفشة / مساعدات", value: "ميكانيكا" },
  { label: "بنشر / إطارات", value: "تواير وبنشر" },
  { label: "توجيه / زوايا", value: "تواير وبنشر" },
  { label: "ديزل", value: "ميكانيكا" },
  { label: "صيانة عامة", value: "صيانة عامة" },
  { label: "غير محدد / استشارة", value: "غير محدد" },
];

const AREAS = [
  "الشويخ الصناعية",
  "الري",
  "الفروانية",
  "الأحمدي",
  "الجهراء",
  "حولي",
  "مبارك الكبير",
  "العاصمة",
];

// Kuwait has many classics/older models — cover 1980→2026, newest first.
const YEARS = Array.from({ length: 2026 - 1980 + 1 }, (_, i) => String(2026 - i));

const URGENCIES = ["عادي", "مستعجل", "طارئ"] as const;

export function NewQuoteForm({ initialService = "" }: { initialService?: string }) {
  const serviceIsKnown = SERVICES.some((s) => s.value === initialService);
  const [service, setService] = useState(serviceIsKnown ? initialService : "");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState("");
  const [problem, setProblem] = useState("");
  const [area, setArea] = useState("");
  const [urgency, setUrgency] = useState<(typeof URGENCIES)[number]>("عادي");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [quoteId, setQuoteId] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (customerName.trim().length < 2) {
      setError("اكتب اسمك.");
      return;
    }
    if (!/^\d{8}$/.test(customerPhone.trim())) {
      setError("اكتب رقم واتساب من ٨ أرقام.");
      return;
    }
    if (!service) {
      setError("اختر نوع الخدمة.");
      return;
    }
    if (problem.trim().length < 10) {
      setError("اشرح المشكلة بتفصيل أكثر (١٠ أحرف على الأقل).");
      return;
    }
    if (!carMake.trim()) {
      setError("اكتب نوع السيارة.");
      return;
    }
    if (!carModel.trim()) {
      setError("اكتب موديل السيارة.");
      return;
    }
    if (!carYear) {
      setError("اختر سنة الصنع.");
      return;
    }

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
        setError(data.error ?? "تعذر إرسال الطلب، حاول مرة أخرى.");
        return;
      }
      track("quote_submit", { service });
      setQuoteId(data.id ?? "");
      setStatus("done");
    } catch {
      setStatus("error");
      setError("تعذر الاتصال، تأكد من الإنترنت وحاول مرة أخرى.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border-2 border-[#FFD60A] bg-[#0A0A0A] p-6 text-center text-white">
        <p className="mb-3 text-lg font-extrabold">طلبك وصلنا</p>
        {quoteId && (
          <p className="mb-3 text-sm text-gray-300">
            رقم الطلب:{" "}
            <span dir="ltr" className="font-mono text-[#FFD60A]">
              {quoteId}
            </span>
          </p>
        )}
        <p className="text-sm text-gray-300">
          بنرسله لكراجات مختصة، وهنتواصل معاك خلال ساعتين بأنسب العروض.
        </p>
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
        <label className={labelCls}>نوع الخدمة {req}</label>
        <select
          value={service}
          onChange={(e) => setService(e.target.value)}
          className={inputCls}
        >
          <option value="">— اختر نوع الخدمة —</option>
          {SERVICES.map((s) => (
            <option key={s.label} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>وصف المشكلة {req}</label>
        <textarea
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="اشرح مشكلة سيارتك بكلامك"
          className={inputCls}
          rows={4}
          maxLength={1000}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>نوع السيارة {req}</label>
          <input
            type="text"
            value={carMake}
            onChange={(e) => setCarMake(e.target.value)}
            placeholder="مثال: تويوتا"
            className={inputCls}
            maxLength={60}
          />
        </div>
        <div>
          <label className={labelCls}>الموديل {req}</label>
          <input
            type="text"
            value={carModel}
            onChange={(e) => setCarModel(e.target.value)}
            placeholder="كامري"
            className={inputCls}
            maxLength={60}
          />
        </div>
        <div>
          <label className={labelCls}>سنة الصنع {req}</label>
          <select
            value={carYear}
            onChange={(e) => setCarYear(e.target.value)}
            className={inputCls}
          >
            <option value="">— اختر —</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>المنطقة المفضلة</label>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className={inputCls}
        >
          <option value="">أي منطقة</option>
          {AREAS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className={labelCls}>مستوى الاستعجال</span>
        <div className="grid grid-cols-3 gap-2">
          {URGENCIES.map((u) => (
            <button
              type="button"
              key={u}
              onClick={() => setUrgency(u)}
              className={`rounded-lg border py-2 text-sm font-bold transition ${
                urgency === u
                  ? "border-[#FFD60A] bg-[#FFD60A] text-[#0A0A0A]"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>اسمك {req}</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="اسمك"
            className={inputCls}
            maxLength={60}
          />
        </div>
        <div>
          <label className={labelCls}>رقم الواتساب {req}</label>
          <input
            type="tel"
            inputMode="numeric"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="٩٩٩٩٩٩٩٩"
            className={inputCls}
            dir="ltr"
            maxLength={8}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            رقمك مخفي عن الكراجات — نستخدمه للتواصل معك فقط.
          </p>
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
        {status === "sending" ? "جارٍ الإرسال..." : "أرسل الطلب"}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        مجاني تماماً — بدون التزام — تصلك العروض خلال ساعات.
      </p>
    </form>
  );
}
