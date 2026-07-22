"use client";

import { useMemo, useState } from "react";
import {
  pricingTypeMeta,
  PARTS_TYPE_LABEL,
  CONDITIONAL_PROTECTION_CLAUSE,
  type PartsType,
} from "@/lib/quote-status";

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

// Rough day-count from free-text duration so "الأسرع تنفيذاً" can sort. Unknown
// text sorts last. Handles digits (Arabic + Latin) and common words.
function durationDays(d: string | null): number {
  if (!d) return Number.POSITIVE_INFINITY;
  const latin = d.replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));
  const num = parseInt((latin.match(/\d+/) ?? [])[0] ?? "", 10);
  if (d.includes("شهر")) return Number.isFinite(num) ? num * 30 : 30;
  if (d.includes("أسبوع") || d.includes("اسبوع")) return Number.isFinite(num) ? num * 7 : 7;
  if (Number.isFinite(num)) return num; // assume days
  return Number.POSITIVE_INFINITY;
}

// Completeness rank: a fixed price is the most certain, then range, then
// conditional. Lower = more complete = shown first.
const PRICING_RANK: Record<string, number> = { fixed: 0, range: 1, conditional: 2 };

type SortKey = "completeness" | "price" | "duration";

export function OffersChooser({ token, offers }: { token: string; offers: PublicOffer[] }) {
  // Default sort is completeness (trust), NOT cheapest — see spec §5.
  const [sort, setSort] = useState<SortKey>("completeness");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState<PublicOffer | null>(null);

  const sorted = useMemo(() => {
    const copy = [...offers];
    if (sort === "price") {
      copy.sort((a, b) => a.price_kwd - b.price_kwd);
    } else if (sort === "duration") {
      copy.sort((a, b) => durationDays(a.estimated_duration) - durationDays(b.estimated_duration));
    } else {
      // completeness: fixed price first, then longer warranty, then cheaper.
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
    if (!window.confirm("هل أنت متأكد؟ سيتم التواصل معك من الكراج المختار")) return;
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
        setError(d.error ?? "تعذّر اختيار العرض، حاول مرة أخرى.");
        return;
      }
      setDone(offer);
    } catch {
      setError("تعذّر الاتصال، تأكد من الإنترنت.");
    } finally {
      setBusyId(null);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border-2 border-[#FFD60A] bg-[#0A0A0A] p-8 text-center text-white">
        <p className="mb-3 text-4xl">🎉</p>
        <p className="mb-2 text-lg font-extrabold">تم اختيار العرض بنجاح</p>
        <p className="text-sm text-gray-300">
          اخترت <span className="font-bold text-[#FFD60A]">{done.workshop_name}</span> بسعر{" "}
          <span className="font-bold text-[#FFD60A]">{priceLabel(done)}</span>.
          <br />
          سيتواصل معك الكراج قريباً.
        </p>
      </div>
    );
  }

  const btn = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-bold transition ${
      active ? "bg-[#FFD60A] text-[#0A0A0A]" : "border border-border bg-card text-foreground"
    }`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">ترتيب:</span>
        <button
          type="button"
          onClick={() => setSort("completeness")}
          className={btn(sort === "completeness")}
        >
          الأنسب (افتراضي)
        </button>
        <button type="button" onClick={() => setSort("price")} className={btn(sort === "price")}>
          الأقل سعراً
        </button>
        <button
          type="button"
          onClick={() => setSort("duration")}
          className={btn(sort === "duration")}
        >
          الأسرع تنفيذاً
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {sorted.map((o) => (
          <OfferCard
            key={o.id}
            offer={o}
            busy={busyId !== null}
            choosing={busyId === o.id}
            onAccept={() => accept(o)}
          />
        ))}
      </ul>
    </div>
  );
}

function priceLabel(o: PublicOffer): string {
  if (o.pricing_type === "range" && o.price_max_kwd != null) {
    return `${o.price_kwd} – ${o.price_max_kwd} د.ك`;
  }
  return `${o.price_kwd} د.ك`;
}

// A meta row: muted label + value, hidden when the value is absent.
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-semibold">{value}</span>
    </p>
  );
}

function OfferCard({
  offer: o,
  busy,
  choosing,
  onAccept,
}: {
  offer: PublicOffer;
  busy: boolean;
  choosing: boolean;
  onAccept: () => void;
}) {
  const meta = pricingTypeMeta(o.pricing_type);
  const parts =
    o.parts_type && PARTS_TYPE_LABEL[o.parts_type as PartsType]
      ? PARTS_TYPE_LABEL[o.parts_type as PartsType]
      : null;
  const inspection =
    o.inspection_fee_kwd == null
      ? null
      : o.inspection_fee_kwd > 0
      ? `${o.inspection_fee_kwd} د.ك`
      : "مجاني";
  const warranty =
    o.warranty_days != null
      ? `${o.warranty_days} يوم — على نفس العطل${o.warranty_note ? ` (${o.warranty_note})` : ""}`
      : null;

  return (
    <li className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-lg font-extrabold">{o.workshop_name}</p>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.className}`}>
          {meta.badge}
        </span>
      </div>

      <p className="mb-3">
        <span className="text-3xl font-extrabold text-[#FFD60A]">{priceLabel(o)}</span>
      </p>

      {o.pricing_type === "conditional" && o.assumed_diagnosis && (
        <Row label="التشخيص المرجّح" value={o.assumed_diagnosis} />
      )}
      <Row label="نوع قطع الغيار" value={parts} />
      {o.pricing_type === "conditional" && <Row label="رسم الكشف" value={inspection} />}
      <Row label="المدة التقديرية" value={o.estimated_duration} />
      <Row label="الضمان" value={warranty} />
      <Row label="صلاحية العرض" value={`${o.validity_days} يوم`} />
      {o.notes && <p className="mt-1 text-sm text-muted-foreground">{o.notes}</p>}

      {/* Protection clause — mandatory on every conditional offer (spec §4). */}
      {o.pricing_type === "conditional" && (
        <p className="mt-3 rounded-lg border border-blue-500/40 bg-blue-500/10 p-3 text-xs leading-relaxed text-blue-300">
          🛡️ {CONDITIONAL_PROTECTION_CLAUSE}
        </p>
      )}

      <button
        type="button"
        onClick={onAccept}
        disabled={busy}
        className="mt-4 w-full rounded-lg bg-[#FFD60A] px-4 py-3 text-base font-extrabold text-[#0A0A0A] transition hover:brightness-95 disabled:opacity-60"
      >
        {choosing ? "جارٍ الاختيار..." : "اختر هذا العرض"}
      </button>
    </li>
  );
}
