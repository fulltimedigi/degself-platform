"use client";

import { useState } from "react";
import { track } from "@/lib/track";

const GOVERNORATES = [
  "العاصمة",
  "حولي",
  "الفروانية",
  "الأحمدي",
  "الجهراء",
  "مبارك الكبير",
];

const SPECIALTIES = [
  "صيانة عامة",
  "ميكانيكا",
  "كهرباء سيارات",
  "تواير وبنشر",
  "بودي وصبغ",
  "قير",
  "زيوت",
  "تكييف",
  "بطاريات",
  "ميزان",
  "أخرى",
];

export function ReportWorkshopForm() {
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [phone, setPhone] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) {
      setError("اكتب اسم الكراج.");
      return;
    }
    setStatus("sending");
    try {
      const source_page =
        typeof window !== "undefined" ? document.referrer || window.location.pathname : "";
      const res = await fetch("/api/report-workshop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          area,
          governorate,
          specialty,
          phone,
          google_maps_url: googleMapsUrl,
          notes,
          reporter_name: reporterName,
          reporter_phone: reporterPhone,
          source_page,
          website,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "تعذر الإرسال.");
        return;
      }
      track("workshop_report_submit", { has_maps_url: googleMapsUrl ? 1 : 0 });
      setStatus("done");
    } catch {
      setStatus("error");
      setError("تعذر الاتصال، حاول مرة أخرى.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
        <p className="mb-2 text-lg font-bold text-foreground">شكراً لك</p>
        <p className="text-sm text-muted-foreground">
          استلمنا التبليغ. سنراجعه ونضيف الكراج خلال 3-7 أيام.
        </p>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none";

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {/* honeypot */}
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
        <label className="mb-1 block text-sm font-bold">
          اسم الكراج <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: كراج ميزان أسد"
          className={inputCls}
          required
          maxLength={200}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-bold">المنطقة</label>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="مثال: الشويخ الصناعية"
            className={inputCls}
            maxLength={120}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold">المحافظة</label>
          <select
            value={governorate}
            onChange={(e) => setGovernorate(e.target.value)}
            className={inputCls}
          >
            <option value="">— اختر —</option>
            {GOVERNORATES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-bold">التخصص</label>
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className={inputCls}
          >
            <option value="">— اختر —</option>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold">رقم الكراج</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+965 ..."
            className={inputCls}
            dir="ltr"
            maxLength={40}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold">رابط Google Maps</label>
        <input
          type="url"
          value={googleMapsUrl}
          onChange={(e) => setGoogleMapsUrl(e.target.value)}
          placeholder="https://maps.google.com/... أو https://share.google/..."
          className={inputCls}
          dir="ltr"
          maxLength={600}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          الرابط يساعدنا نتحقق ونضيفه بسرعة.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold">ملاحظات إضافية</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أي معلومة مفيدة (مواعيد، ماركة سيارات يخدمها، إلخ)"
          className={inputCls}
          rows={3}
          maxLength={1000}
        />
      </div>

      <details className="rounded-lg border border-border bg-card/50 p-3">
        <summary className="cursor-pointer text-sm font-bold">
          بياناتك (اختياري — للتواصل لو احتجنا التأكد)
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="text"
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            placeholder="اسمك"
            className={inputCls}
            maxLength={80}
          />
          <input
            type="tel"
            value={reporterPhone}
            onChange={(e) => setReporterPhone(e.target.value)}
            placeholder="رقمك"
            className={inputCls}
            dir="ltr"
            maxLength={40}
          />
        </div>
      </details>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-lg bg-primary px-4 py-3 text-base font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {status === "sending" ? "جارٍ الإرسال..." : "أرسل التبليغ"}
      </button>
    </form>
  );
}
