"use client";

import { useMemo, useState } from "react";

export interface PublicOffer {
  id: string;
  workshop_name: string;
  price_kwd: number;
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

export function OffersChooser({ token, offers }: { token: string; offers: PublicOffer[] }) {
  const [sort, setSort] = useState<"price" | "duration">("price");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState<PublicOffer | null>(null);

  const sorted = useMemo(() => {
    const copy = [...offers];
    if (sort === "price") copy.sort((a, b) => a.price_kwd - b.price_kwd);
    else copy.sort((a, b) => durationDays(a.estimated_duration) - durationDays(b.estimated_duration));
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
          <span className="font-bold text-[#FFD60A]">{done.price_kwd} د.ك</span>.
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
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">ترتيب:</span>
        <button type="button" onClick={() => setSort("price")} className={btn(sort === "price")}>
          الأقل سعراً
        </button>
        <button type="button" onClick={() => setSort("duration")} className={btn(sort === "duration")}>
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
          <li key={o.id} className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-1 text-lg font-extrabold">{o.workshop_name}</p>
            <p className="mb-2">
              <span className="text-3xl font-extrabold text-[#FFD60A]">{o.price_kwd}</span>
              <span className="mr-1 text-sm text-muted-foreground"> د.ك</span>
            </p>
            {o.estimated_duration && (
              <p className="mb-1 text-sm text-muted-foreground">مدة التنفيذ: {o.estimated_duration}</p>
            )}
            {o.notes && <p className="mb-3 text-sm text-muted-foreground">{o.notes}</p>}
            <button
              type="button"
              onClick={() => accept(o)}
              disabled={busyId !== null}
              className="mt-2 w-full rounded-lg bg-[#FFD60A] px-4 py-3 text-base font-extrabold text-[#0A0A0A] transition hover:brightness-95 disabled:opacity-60"
            >
              {busyId === o.id ? "جارٍ الاختيار..." : "اختر هذا العرض"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
