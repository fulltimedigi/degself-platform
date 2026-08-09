"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PARTS_TYPES, type PartsType } from "@/lib/quote-status";
import { track } from "@/lib/track";

export interface PublicOffer {
  id: string;
  workshop_name: string;
  pricing_type: string;
  price_kwd: number;
  price_max_kwd: number | null;
  assumed_diagnosis: string | null;
  inspection_fee_kwd: number | null;
  parts_type: string | null;
  validity_days: number;
  warranty_days: number | null;
  warranty_note: string | null;
  estimated_duration: string | null;
  notes: string | null;
}

const DURATION_DAYS: Record<string, number> = {
  same_day: 0,
  "1_day": 1,
  "2_days": 2,
  "3_days": 3,
  "4_7_days": 7,
  over_week: 8,
  unknown_until_inspection: Number.POSITIVE_INFINITY,
};

const DURATION_LABELS = {
  ar: {
    same_day: "نفس اليوم",
    "1_day": "يوم",
    "2_days": "يومان",
    "3_days": "3 أيام",
    "4_7_days": "4–7 أيام",
    over_week: "أكثر من أسبوع",
    unknown_until_inspection: "غير معروف حتى الفحص",
  },
  en: {
    same_day: "Same day",
    "1_day": "1 day",
    "2_days": "2 days",
    "3_days": "3 days",
    "4_7_days": "4–7 days",
    over_week: "More than a week",
    unknown_until_inspection: "Unknown until inspection",
  },
  hi: {
    same_day: "उसी दिन",
    "1_day": "1 दिन",
    "2_days": "2 दिन",
    "3_days": "3 दिन",
    "4_7_days": "4–7 दिन",
    over_week: "एक हफ्ते से ज्यादा",
    unknown_until_inspection: "जांच तक पता नहीं",
  },
  ur: {
    same_day: "اسی دن",
    "1_day": "1 دن",
    "2_days": "2 دن",
    "3_days": "3 دن",
    "4_7_days": "4–7 دن",
    over_week: "ایک ہفتے سے زیادہ",
    unknown_until_inspection: "معائنے تک معلوم نہیں",
  },
} as const;

function durationDays(d: string | null): number {
  if (!d) return Number.POSITIVE_INFINITY;
  if (d in DURATION_DAYS) return DURATION_DAYS[d];
  const latin = d.replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));
  const num = parseInt((latin.match(/\d+/) ?? [])[0] ?? "", 10);
  if (d.includes("شهر")) return Number.isFinite(num) ? num * 30 : 30;
  if (d.includes("أسبوع") || d.includes("اسبوع")) return Number.isFinite(num) ? num * 7 : 7;
  if (Number.isFinite(num)) return num;
  return Number.POSITIVE_INFINITY;
}

function durationLabel(d: string | null, locale: string): string | null {
  if (!d) return null;
  const labels = DURATION_LABELS[(locale in DURATION_LABELS ? locale : "ar") as keyof typeof DURATION_LABELS];
  return d in labels ? labels[d as keyof typeof labels] : d;
}

const PRICING_RANK: Record<string, number> = { fixed: 0, range: 1, conditional: 2 };

const PRICING_BADGE_CLASS: Record<string, string> = {
  fixed: "bg-green-600 text-white",
  range: "bg-amber-500 text-[#0A0A0A]",
  conditional: "bg-blue-500 text-white",
};

type SortKey = "completeness" | "price" | "duration";

function priceLabel(o: PublicOffer, currency: string): string {
  if (o.pricing_type === "range" && o.price_max_kwd != null) {
    return `${o.price_kwd} – ${o.price_max_kwd} ${currency}`;
  }
  return `${o.price_kwd} ${currency}`;
}

export function OffersChooser({ token, offers }: { token: string; offers: PublicOffer[] }) {
  const t = useTranslations("offers");
  const locale = useLocale();
  const currency = t("currency");
  const [sort, setSort] = useState<SortKey>("completeness");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState<PublicOffer | null>(null);

  useEffect(() => {
    track("offers_view", { offer_count: offers.length, status: "open", locale });
  }, [locale, offers.length]);

  const sorted = useMemo(() => {
    const copy = [...offers];
    if (sort === "price") {
      copy.sort((a, b) => a.price_kwd - b.price_kwd);
    } else if (sort === "duration") {
      copy.sort((a, b) => durationDays(a.estimated_duration) - durationDays(b.estimated_duration));
    } else {
      copy.sort((a, b) => {
        const pr = (PRICING_RANK[a.pricing_type] ?? 3) - (PRICING_RANK[b.pricing_type] ?? 3);
        if (pr !== 0) return pr;
        const wa = (b.warranty_days ?? 0) - (a.warranty_days ?? 0);
        if (wa !== 0) return wa;
        return a.price_kwd - b.price_kwd;
      });
    }
    return copy;
  }, [offers, sort]);

  async function accept(offer: PublicOffer) {
    if (!window.confirm(t("confirmAccept"))) return;
    setBusyId(offer.id);
    setError("");
    try {
      const res = await fetch(`/api/offers/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer_id: offer.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? t("acceptError"));
        return;
      }
      track("offer_accept", { offer_count: offers.length, status: "accepted", locale });
      setDone(offer);
    } catch {
      setError(t("connError"));
    } finally {
      setBusyId(null);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border-2 border-[#FFD60A] bg-[#0A0A0A] p-8 text-center text-white">
        <p className="mb-3 text-4xl">🎉</p>
        <p className="mb-2 text-lg font-extrabold">{t("doneTitle")}</p>
        <p className="text-sm text-gray-300">
          {t.rich("doneChose", {
            name: done.workshop_name,
            price: priceLabel(done, currency),
            b: (chunks) => <span className="font-bold text-[#FFD60A]">{chunks}</span>,
          })}
          <br />
          {t("doneContact")}
        </p>
      </div>
    );
  }

  const btn = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-bold transition ${active ? "bg-[#FFD60A] text-[#0A0A0A]" : "border border-border bg-card text-foreground"}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{t("sortLabel")}</span>
        <button type="button" onClick={() => setSort("completeness")} className={btn(sort === "completeness")}>{t("sortBest")}</button>
        <button type="button" onClick={() => setSort("price")} className={btn(sort === "price")}>{t("sortCheapest")}</button>
        <button type="button" onClick={() => setSort("duration")} className={btn(sort === "duration")}>{t("sortFastest")}</button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}

      <ul className="flex flex-col gap-3">
        {sorted.map((o) => (
          <OfferCard key={o.id} offer={o} currency={currency} locale={locale} busy={busyId !== null} choosing={busyId === o.id} onAccept={() => accept(o)} />
        ))}
      </ul>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return <p className="text-sm"><span className="text-muted-foreground">{label}: </span><span className="font-semibold">{value}</span></p>;
}

function OfferCard({
  offer: o,
  currency,
  locale,
  busy,
  choosing,
  onAccept,
}: {
  offer: PublicOffer;
  currency: string;
  locale: string;
  busy: boolean;
  choosing: boolean;
  onAccept: () => void;
}) {
  const t = useTranslations("offers");
  const badgeClass = PRICING_BADGE_CLASS[o.pricing_type] ?? "bg-neutral-600 text-white";
  const parts = o.parts_type && (PARTS_TYPES as readonly string[]).includes(o.parts_type)
    ? t(`partsLabel.${o.parts_type as PartsType}`)
    : null;
  const inspection = o.inspection_fee_kwd == null ? null : o.inspection_fee_kwd > 0 ? `${o.inspection_fee_kwd} ${currency}` : t("free");
  const warranty = o.warranty_days != null
    ? `${t("warranty", { days: o.warranty_days })}${o.warranty_note ? ` (${o.warranty_note})` : ""}`
    : null;

  return (
    <li className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-lg font-extrabold">{o.workshop_name}</p>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badgeClass}`}>{t(`pricingBadge.${o.pricing_type}`)}</span>
      </div>

      <p className="mb-3"><span className="text-3xl font-extrabold text-[#FFD60A]">{priceLabel(o, currency)}</span></p>

      {o.pricing_type === "conditional" && o.assumed_diagnosis && <Row label={t("rowDiagnosis")} value={o.assumed_diagnosis} />}
      <Row label={t("rowParts")} value={parts} />
      {o.pricing_type === "conditional" && <Row label={t("rowInspection")} value={inspection} />}
      <Row label={t("rowDuration")} value={durationLabel(o.estimated_duration, locale)} />
      <Row label={t("rowWarranty")} value={warranty} />
      <Row label={t("rowValidity")} value={t("validityDays", { days: o.validity_days })} />
      {o.notes && <p className="mt-1 text-sm text-muted-foreground">{o.notes}</p>}

      {o.pricing_type === "conditional" && (
        <p className="mt-3 rounded-lg border border-blue-500/40 bg-blue-500/10 p-3 text-xs leading-relaxed text-blue-300">🛡️ {t("protectionClause")}</p>
      )}

      <button type="button" onClick={onAccept} disabled={busy} className="mt-4 w-full rounded-lg bg-[#FFD60A] px-4 py-3 text-base font-extrabold text-[#0A0A0A] transition hover:brightness-95 disabled:opacity-60">
        {choosing ? t("choosing") : t("chooseThis")}
      </button>
    </li>
  );
}
