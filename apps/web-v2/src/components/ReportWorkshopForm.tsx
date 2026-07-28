"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/track";

// value = Arabic (submitted to the API / stored); key = i18n label
const GOVERNORATES = [
  { v: "العاصمة", k: "capital" },
  { v: "حولي", k: "hawalli" },
  { v: "الفروانية", k: "farwaniya" },
  { v: "الأحمدي", k: "ahmadi" },
  { v: "الجهراء", k: "jahra" },
  { v: "مبارك الكبير", k: "mubarak" },
] as const;

const SPECIALTIES = [
  { v: "صيانة عامة", k: "general" },
  { v: "ميكانيكا", k: "mechanics" },
  { v: "كهرباء سيارات", k: "electrical" },
  { v: "تواير وبنشر", k: "tires" },
  { v: "بودي وصبغ", k: "bodywork" },
  { v: "قير", k: "gearbox" },
  { v: "زيوت", k: "oils" },
  { v: "تكييف", k: "ac" },
  { v: "بطاريات", k: "batteries" },
  { v: "ميزان", k: "alignment" },
  { v: "أخرى", k: "other" },
] as const;

export function ReportWorkshopForm() {
  const t = useTranslations("misc.report");
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
      setError(t("errName"));
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
        setError(data.error ?? t("errSend"));
        return;
      }
      track("workshop_report_submit", { has_maps_url: googleMapsUrl ? 1 : 0 });
      setStatus("done");
    } catch {
      setStatus("error");
      setError(t("errConn"));
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
        <p className="mb-2 text-lg font-bold text-foreground">{t("thankYou")}</p>
        <p className="text-sm text-muted-foreground">{t("thankYouBody")}</p>
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
          {t("workshopName")} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("workshopNameEg")}
          className={inputCls}
          required
          maxLength={200}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-bold">{t("area")}</label>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder={t("areaEg")}
            className={inputCls}
            maxLength={120}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold">{t("governorate")}</label>
          <select
            value={governorate}
            onChange={(e) => setGovernorate(e.target.value)}
            className={inputCls}
          >
            <option value="">{t("choose")}</option>
            {GOVERNORATES.map((g) => (
              <option key={g.v} value={g.v}>
                {t(`gov.${g.k}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-bold">{t("specialty")}</label>
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className={inputCls}
          >
            <option value="">{t("choose")}</option>
            {SPECIALTIES.map((s) => (
              <option key={s.v} value={s.v}>
                {t(`spec.${s.k}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold">{t("phone")}</label>
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
        <label className="mb-1 block text-sm font-bold">{t("mapsUrl")}</label>
        <input
          type="url"
          value={googleMapsUrl}
          onChange={(e) => setGoogleMapsUrl(e.target.value)}
          placeholder="https://maps.google.com/... "
          className={inputCls}
          dir="ltr"
          maxLength={600}
        />
        <p className="mt-1 text-xs text-muted-foreground">{t("mapsHint")}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold">{t("notes")}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("notesEg")}
          className={inputCls}
          rows={3}
          maxLength={1000}
        />
      </div>

      <details className="rounded-lg border border-border bg-card/50 p-3">
        <summary className="cursor-pointer text-sm font-bold">{t("contactLabel")}</summary>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="text"
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            placeholder={t("yourName")}
            className={inputCls}
            maxLength={80}
          />
          <input
            type="tel"
            value={reporterPhone}
            onChange={(e) => setReporterPhone(e.target.value)}
            placeholder={t("yourPhone")}
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
        {status === "sending" ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
