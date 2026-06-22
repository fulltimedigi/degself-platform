"use client";

import { useState } from "react";
import Link from "next/link";
import { track } from "@/lib/track";
import { StarRating } from "@/components/StarRating";
import { MicButton } from "@/components/MicButton";
import { MAX_INPUT_CHARS, categoryToSpecialty, type TranslateResponse } from "@/lib/garageTranslator";

const PLACEHOLDER = "اكتب مشكلة سيارتك… مثلاً: المكيف ما يبرّد بالنهار";

// نطاق التكلفة التقريبي بالدينار الكويتي لكل تصنيف.
// مرجعي فقط — التفصيل في /asaar.
const CATEGORY_PRICE_RANGE: Record<string, { low: number; high: number; note?: string }> = {
  "ميكانيكا": { low: 15, high: 300, note: "تشخيص + إصلاح بسيط إلى متوسط" },
  "كهرباء سيارات": { low: 15, high: 120 },
  "قير وفتيس": { low: 30, high: 900, note: "تجفيت/زيت قير حتى تبديل" },
  "تكييف": { low: 8, high: 350, note: "شحن فريون حتى تبديل كباس" },
  "تواير وبنشر": { low: 5, high: 380 },
  "فرامل": { low: 20, high: 180 },
  "بودي وصبغ": { low: 15, high: 550, note: "قطعة واحدة حتى صبغ كامل" },
  "كمبيوتر وتشخيص": { low: 5, high: 50 },
  "بطاريات": { low: 18, high: 65 },
  "زيوت وصيانة": { low: 8, high: 50 },
  "ونش وسحب": { low: 10, high: 50 },
  "صيانة عامة": { low: 10, high: 200 },
};

export function GarageTranslator() {
  const [input, setInput] = useState("");
  const [interim, setInterim] = useState(""); // live voice transcript (before final)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslateResponse | null>(null);
  const [copied, setCopied] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runTranslate(input);
  }

  // Shared by the form submit and the mic (which passes its final transcript
  // directly, since setInput state isn't applied yet when it fires).
  async function runTranslate(raw: string) {
    const text = raw.trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "حدث خطأ، حاول مرة أخرى.");
        return;
      }
      const payload = data as TranslateResponse;
      setResult(payload);
      // تتبّع بدون أي بيانات شخصية — التصنيف فقط.
      track("translate_used", {
        car_related: payload.is_car_related,
        category: payload.category ?? "none",
      });
    } catch {
      setError("تعذّر الاتصال، تأكد من الإنترنت وحاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  async function copyMessage() {
    if (!result?.whatsapp_message) return;
    try {
      await navigator.clipboard.writeText(result.whatsapp_message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* المتصفح رفض النسخ — نتجاهل بهدوء */
    }
  }

  return (
    <section className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
      {/* وهج أصفر خفيف في الخلفية */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="flex flex-col gap-2 text-center">
        <h2 className="text-2xl font-extrabold">اكتشف العطل</h2>
        <p className="text-sm text-muted-foreground">
          اشرح المشكلة في سيارتك بكلامك العادي، ونبيّن لك أشهر الأسباب المحتملة وأنسب كراج لها.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_CHARS))}
              placeholder={PLACEHOLDER}
              rows={3}
              maxLength={MAX_INPUT_CHARS}
              className="w-full resize-none rounded-xl border border-border bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            {interim && (
              <p className="mt-1 px-1 text-sm italic text-muted-foreground">{interim}</p>
            )}
          </div>
          <MicButton
            className="mt-1"
            onResult={(text) => {
              setInput(text);
              setInterim("");
              runTranslate(text);
            }}
            onInterim={setInterim}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          اضغط المايك واشرح المشكلة بصوتك، أو اكتب بيدك
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {input.length}/{MAX_INPUT_CHARS}
          </span>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-primary px-6 py-3 font-extrabold text-primary-foreground shadow-md transition hover:opacity-90 hover:shadow-primary/30 disabled:cursor-not-allowed disabled:bg-primary/40 disabled:text-primary-foreground/70 disabled:shadow-none"
          >
            {loading ? "جارٍ الكشف…" : "اكتشف العطل"}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {result && !result.is_car_related && (
        <p className="mt-5 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          {result.whatsapp_message}
        </p>
      )}

      {result && result.is_car_related && (
        <div className="mt-6 flex flex-col gap-5">
          {/* التصنيف */}
          {result.category && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">التخصص المطلوب:</span>
              <span className="rounded-full bg-primary/15 px-3 py-1 text-sm font-bold text-primary">
                {result.category}
              </span>
            </div>
          )}

          {/* نطاق التكلفة المتوقع */}
          {result.category && CATEGORY_PRICE_RANGE[result.category] && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">نطاق التكلفة المتوقع</span>
                  <span className="text-lg font-extrabold text-primary">
                    {CATEGORY_PRICE_RANGE[result.category].low} – {CATEGORY_PRICE_RANGE[result.category].high} د.ك
                  </span>
                  {CATEGORY_PRICE_RANGE[result.category].note && (
                    <span className="text-xs text-muted-foreground">
                      {CATEGORY_PRICE_RANGE[result.category].note}
                    </span>
                  )}
                </div>
                <Link
                  href="/asaar"
                  onClick={() => track("translator_to_asaar", { category: result.category ?? "none" })}
                  className="shrink-0 rounded-lg border border-primary/40 px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/10"
                >
                  احسب بالتفصيل
                </Link>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                أسعار تقديرية في السوق الكويتي — تختلف حسب السيارة وحجم العطل.
              </p>
            </div>
          )}

          {/* CTA رئيسي: ابحث عن كراج */}
          {result.category && (
            <Link
              href={`/search?specialty=${encodeURIComponent(categoryToSpecialty(result.category))}`}
              onClick={() => track("translator_to_search", { category: result.category ?? "none" })}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-extrabold text-primary-foreground transition hover:opacity-90"
            >
              ابحث عن كراج لـ {result.category}
              <span aria-hidden>←</span>
            </Link>
          )}

          {/* الأسباب المحتملة */}
          {result.possible_causes.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold">أشهر الأسباب المحتملة:</h3>
              <ul className="flex flex-col gap-1.5">
                {result.possible_causes.map((cause, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-primary" aria-hidden>
                      •
                    </span>
                    <span>{cause}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* تنبيه */}
          {result.disclaimer && (
            <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-400">
              ⚠️ {result.disclaimer}
            </p>
          )}

          {/* رسالة الواتساب الجاهزة */}
          {result.whatsapp_message && (
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold">رسالة جاهزة للكراج:</h3>
                <button
                  type="button"
                  onClick={copyMessage}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-primary/10"
                >
                  {copied ? "تم النسخ ✓" : "انسخ الرسالة"}
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {result.whatsapp_message}
              </p>
            </div>
          )}

          {/* الكراجات المقترحة */}
          {result.garages.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold">كراجات مقترحة لهذا التخصص:</h3>
              <ul className="flex flex-col gap-2">
                {result.garages.map((g) => (
                  <li
                    key={g.place_id}
                    className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-col gap-1">
                      <Link
                        href={`/workshop/${g.place_id}`}
                        className="font-semibold hover:text-primary"
                      >
                        {g.name}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {g.google_rating != null && (
                          <StarRating rating={g.google_rating} />
                        )}
                        {g.area && <span>{g.area}</span>}
                      </div>
                    </div>
                    {g.wa_digits && (
                      <a
                        href={`https://wa.me/${g.wa_digits}?text=${encodeURIComponent(
                          result.whatsapp_message
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          track("whatsapp", { place_id: g.place_id, source: "translator" })
                        }
                        className="inline-flex w-fit items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
                          <path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.9 11.9L4 20l4.2-1.1a7.9 7.9 0 0 0 3.8.97h.004a7.94 7.94 0 0 0 5.6-13.55zM12.05 18.5a6.56 6.56 0 0 1-3.34-.92l-.24-.14-2.49.65.66-2.43-.16-.25a6.59 6.59 0 1 1 5.57 3.09z" />
                        </svg>
                        واتساب
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
