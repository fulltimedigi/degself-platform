"use client";

import { useState } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { StarRating } from "@/components/StarRating";
import { MAX_INPUT_CHARS, type TranslateResponse } from "@/lib/garageTranslator";

const PLACEHOLDER = "اكتب مشكلة سيارتك… مثلاً: الثلاجة ما تبرّد بالنهار";

export function GarageTranslator() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslateResponse | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
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
    <section className="mx-auto w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-2 text-center">
        <h2 className="text-2xl font-extrabold">مترجم الكراج</h2>
        <p className="text-sm text-muted-foreground">
          اكتب مشكلة سيارتك بكلامك العادي، ونوريك أشهر الأسباب المحتملة وأنسب كراج لها.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_CHARS))}
          placeholder={PLACEHOLDER}
          rows={3}
          maxLength={MAX_INPUT_CHARS}
          className="w-full resize-none rounded-xl border border-border bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {input.length}/{MAX_INPUT_CHARS}
          </span>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "جارٍ الترجمة…" : "ترجم"}
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
