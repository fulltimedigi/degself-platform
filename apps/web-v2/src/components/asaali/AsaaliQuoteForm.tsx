"use client";

/**
 * Compact quote request form pre-filled from an Asaali diagnosis.
 * Submits to POST /api/quotes with source=asaali and matched partner workshops.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/track";
import type { AsaaliResponse, VehicleContext } from "@/lib/asaali-schema";

const AREAS = [
  "العاصمة",
  "حولي",
  "الفروانية",
  "الأحمدي",
  "الجهراء",
  "مبارك الكبير",
] as const;

type Props = {
  response: AsaaliResponse;
  vehicle: VehicleContext;
  onDone?: () => void;
};

export function AsaaliQuoteForm({ response, vehicle, onDone }: Props) {
  const t = useTranslations("asaali");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [quoteId, setQuoteId] = useState("");

  const service =
    response.quote_service ||
    "خدمة أخرى (اكتبها في وصف المشكلة)";
  const problem =
    response.problem_summary ||
    response.explanation ||
    response.whatsapp_message ||
    "";
  const carMake = vehicle.make || "غير محدد";
  const carModel = vehicle.model || "غير محدد";
  const carYear = vehicle.year ? String(vehicle.year) : "غير محدد";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) {
      setError(t("quoteErrName"));
      return;
    }
    if (!/^\d{8}$/.test(phone.trim())) {
      setError(t("quoteErrPhone"));
      return;
    }
    if (problem.trim().length < 10) {
      setError(t("quoteErrProblem"));
      return;
    }

    setStatus("sending");
    try {
      const matched = (response.recommended_workshops ?? []).map((w) => ({
        place_id: w.id,
        name: w.name,
        phone: w.phone,
      }));
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          service,
          car_make: carMake,
          car_model: carModel,
          car_year: carYear,
          problem_description: problem.slice(0, 1000),
          area,
          urgency: "عادي",
          source: "asaali",
          matched_workshops: matched,
          website: "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? t("quoteErrSend"));
        return;
      }
      track("quote_submit", {
        service,
        source: "asaali",
        from_partners: Boolean(response.from_partners),
      });
      setQuoteId(typeof data.id === "string" ? data.id : "");
      setStatus("done");
      onDone?.();
    } catch {
      setStatus("error");
      setError(t("quoteErrConn"));
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-xl border border-yellow-400/40 bg-yellow-400/5 p-4 text-center">
        <p className="text-sm font-semibold text-yellow-300">{t("quoteDoneTitle")}</p>
        {quoteId && (
          <p className="mt-2 text-xs text-neutral-400" dir="ltr">
            {t("quoteDoneId")}: {quoteId}
          </p>
        )}
        <p className="mt-2 text-xs text-neutral-300">{t("quoteDoneBody")}</p>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-yellow-400";

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-yellow-400/40 bg-yellow-400/5 p-4">
      <div>
        <div className="text-xs font-semibold text-yellow-300">{t("quoteTitle")}</div>
        <p className="mt-1 text-xs text-neutral-400">{t("quoteSubtitle")}</p>
        {response.from_partners && (
          <p className="mt-1 text-[11px] text-emerald-400">{t("quotePartnersHint")}</p>
        )}
      </div>

      <div className="rounded-lg bg-neutral-900/80 px-3 py-2 text-xs text-neutral-300">
        <div>
          <span className="text-neutral-500">{t("quoteServiceLabel")}: </span>
          {service}
        </div>
        <div className="mt-1">
          <span className="text-neutral-500">{t("quoteCarLabel")}: </span>
          {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(" ") ||
            t("quoteCarUnknown")}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-400">{t("quoteNameLabel")}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          autoComplete="name"
          maxLength={60}
          disabled={status === "sending"}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-400">{t("quotePhoneLabel")}</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 8))}
          className={inputCls}
          inputMode="numeric"
          placeholder="9XXXXXXX"
          dir="ltr"
          disabled={status === "sending"}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-400">{t("quoteAreaLabel")}</label>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className={inputCls}
          disabled={status === "sending"}
        >
          <option value="">{t("choose")}</option>
          {AREAS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-50"
        style={{ background: "#FFD60A" }}
      >
        {status === "sending" ? t("quoteSending") : t("quoteSubmit")}
      </button>
    </form>
  );
}
