"use client";

/**
 * AsaaliChat — الواجهة الرئيسية لميزة /asaali
 *
 * الأدوار:
 *   1. يعرض VehicleSelector (يفتح تلقائياً لو رجع status='needs_vehicle_info')
 *   2. يستقبل نص (مكتوب الآن — الـ mic سيُضاف لاحقاً)
 *   3. يستدعي POST /api/asaali
 *   4. يعرض الرد منظّماً: ملخص + مصطلحات + تحذير + كراجات + رسالة واتساب
 *
 * حالة:
 *   - vehicle: useState (لا localStorage، لا Supabase) — قرار المستخدم
 *   - history: آخر 6 turns تُرسل للـ API لدعم المتابعة
 */

import { useState } from "react";
import Link from "next/link";
import { track } from "@/lib/track";
import { VehicleSelector } from "./VehicleSelector";
import type {
  VehicleContext as VehicleContextT,
  AsaaliResponse,
} from "@/lib/asaali-schema";

const PLACEHOLDER = "اكتبي مشكلة سيارتك، مثلاً: السيارة تخرج دخان أبيض";
const MAX_INPUT = 800;

interface HistoryItem {
  role: "user" | "assistant";
  content: string;
}

export function AsaaliChat() {
  const [vehicle, setVehicle] = useState<VehicleContextT>({});
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AsaaliResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);

  async function submit(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const res = await fetch("/api/asaali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          vehicle,
          conversation_history: history,
        }),
      });
      const data = (await res.json()) as AsaaliResponse;

      if (data.status === "needs_vehicle_info") {
        setVehicleOpen(true);
      }

      setResponse(data);
      setHistory((h) => [
        ...h,
        { role: "user", content: text },
        {
          role: "assistant",
          content:
            data.problem_summary ?? data.follow_up_question ?? data.fallback_message ?? "",
        },
      ]);
      setInput("");

      track("asaali_used", {
        status: data.status,
        has_vehicle: Boolean(vehicle.make),
        source: data.source ?? "llm",
      });
    } catch {
      setError("تعذّر الاتصال، تأكدي من الإنترنت وحاولي مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  async function copyMessage(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* تجاهل بهدوء */
    }
  }

  function reset() {
    setResponse(null);
    setHistory([]);
    setInput("");
    setError(null);
  }

  const showWarning = response?.warning && response.warning.severity !== "safe";
  const warningColor =
    response?.warning?.severity === "urgent"
      ? "border-red-500 bg-red-500/10 text-red-200"
      : "border-amber-500 bg-amber-500/10 text-amber-200";

  return (
    <div className="space-y-5">
      {/* اختيار السيارة */}
      <VehicleSelector
        value={vehicle}
        onChange={setVehicle}
        defaultOpen={vehicleOpen}
      />

      {/* مدخل النص */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={4}
          maxLength={MAX_INPUT}
          className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-4 py-3 text-base text-neutral-100 placeholder-neutral-500 outline-none focus:border-yellow-400"
          disabled={loading}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-neutral-500">
            {input.length}/{MAX_INPUT}
          </span>
          <div className="flex gap-2">
            {response && (
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
              >
                محادثة جديدة
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-50"
              style={{ background: "#FFD60A" }}
            >
              {loading ? "جاري التشخيص..." : "اسألي"}
            </button>
          </div>
        </div>
      </form>

      {/* خطأ */}
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* الرد */}
      {response && (
        <div className="space-y-4">
          {/* رسائل النظام (budget/rate/scope) */}
          {response.fallback_message && (
            <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4 text-sm text-neutral-200">
              {response.fallback_message}
            </div>
          )}

          {/* سؤال متابعة */}
          {response.follow_up_question && (
            <div className="rounded-xl border border-yellow-400/40 bg-yellow-400/5 p-4">
              <div className="mb-1 text-xs text-yellow-400">سؤال للتشخيص الأدق</div>
              <p className="text-base text-neutral-100">{response.follow_up_question}</p>
            </div>
          )}

          {/* الملخص */}
          {response.problem_summary && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="mb-1 text-xs text-neutral-400">ملخص المشكلة</div>
              <p className="text-base text-neutral-100">{response.problem_summary}</p>
            </div>
          )}

          {/* التحذير */}
          {showWarning && response.warning && (
            <div className={`rounded-xl border p-4 ${warningColor}`}>
              <div className="mb-1 text-xs uppercase tracking-wide">
                {response.warning.severity === "urgent" ? "تحذير عاجل" : "تنبيه"}
              </div>
              <p className="text-sm mb-2">{response.warning.message}</p>
              <p className="text-sm font-medium">→ {response.warning.action}</p>
            </div>
          )}

          {/* المصطلحات الرسمية */}
          {response.official_terms && response.official_terms.length > 0 && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="mb-2 text-xs text-neutral-400">المصطلح الصحيح</div>
              <div className="space-y-2">
                {response.official_terms.map((t, i) => (
                  <div key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-base font-semibold text-yellow-300">{t.arabic}</span>
                    <span className="text-sm text-neutral-500" dir="ltr">
                      {t.english}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* الشرح */}
          {response.explanation && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="mb-1 text-xs text-neutral-400">السبب المحتمل</div>
              <p className="text-sm text-neutral-200 leading-relaxed">{response.explanation}</p>
            </div>
          )}

          {/* الكراجات المقترحة */}
          {response.recommended_workshops && response.recommended_workshops.length > 0 && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="mb-2 text-xs text-neutral-400">كراجات مقترحة</div>
              <div className="space-y-2">
                {response.recommended_workshops.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-neutral-900 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm text-neutral-100">{w.name}</div>
                      {w.area && (
                        <div className="text-xs text-neutral-500">{w.area}</div>
                      )}
                    </div>
                    {w.phone && (
                      <a
                        href={`tel:${w.phone}`}
                        className="rounded-md bg-yellow-400 px-3 py-1 text-xs font-semibold text-black"
                        style={{ background: "#FFD60A" }}
                      >
                        اتصلي
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center">
                <Link
                  href="/"
                  className="text-xs text-yellow-300 hover:underline"
                >
                  عرض كل الكراجات في الكويت
                </Link>
              </div>
            </div>
          )}

          {/* رسالة واتساب جاهزة */}
          {response.whatsapp_message && (
            <div className="rounded-xl border border-yellow-400/40 bg-yellow-400/5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs text-yellow-300">رسالة جاهزة للكراج</div>
                <button
                  type="button"
                  onClick={() => copyMessage(response.whatsapp_message ?? "")}
                  className="rounded-md bg-yellow-400 px-3 py-1 text-xs font-semibold text-black"
                  style={{ background: "#FFD60A" }}
                >
                  {copied ? "تم النسخ" : "نسخ الرسالة"}
                </button>
              </div>
              <p className="text-sm text-neutral-100 whitespace-pre-wrap">
                {response.whatsapp_message}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
