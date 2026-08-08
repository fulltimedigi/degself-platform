"use client";

import { useEffect, useState } from "react";

type Workshop = {
  place_id: string;
  name: string;
  phone: string;
};

type DeliveryItem = {
  id: string;
  workshop_id: string;
  status: "queued" | "sending" | "sent" | "failed" | "blocked_no_channel" | "cancelled";
  channel: "whatsapp" | "manual";
  target_rank: number;
  selection_score: number;
  selection_reason: string;
  attempts: number;
  sent_at: string | null;
  last_error: string | null;
  outreach_id: string | null;
};

const STATUS_LABELS: Record<DeliveryItem["status"], string> = {
  queued: "بانتظار الإرسال",
  sending: "جارٍ الإرسال",
  sent: "تم الإرسال",
  failed: "فشل الإرسال",
  blocked_no_channel: "لا توجد قناة إرسال",
  cancelled: "ملغي",
};

function normalizedWorkshops(value: unknown): Workshop[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: Workshop[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const placeId = typeof row.place_id === "string" ? row.place_id.trim() : "";
    if (!placeId || seen.has(placeId)) continue;
    seen.add(placeId);
    result.push({
      place_id: placeId,
      name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : placeId,
      phone: typeof row.phone === "string" ? row.phone.trim() : "",
    });
  }
  return result;
}

export function MeasuredGarageLinks({ quoteId, value }: { quoteId: string; value: unknown }) {
  const workshops = normalizedWorkshops(value);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [queue, setQueue] = useState<DeliveryItem[]>([]);

  useEffect(() => {
    let active = true;
    void fetch(`/api/admin/quotes/${quoteId}/delivery-queue`, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (active && res.ok && Array.isArray(body.items)) setQueue(body.items);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [quoteId]);

  if (workshops.length === 0) return null;

  async function createLink(workshop: Workshop) {
    setBusyId(workshop.place_id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/quotes/${quoteId}/garage-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workshop_id: workshop.place_id }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || typeof body.url !== "string") {
        setMessage(body.error ?? "تعذّر إنشاء رابط الكراج القابل للقياس.");
        return;
      }

      let copied = false;
      try {
        await navigator.clipboard.writeText(body.url);
        copied = true;
      } catch {
        // URL remains visible for manual copy.
      }
      setMessage(`${workshop.name}: ${copied ? "تم إنشاء الرابط ونسخه" : "تم إنشاء الرابط"} — ${body.url}`);
    } catch {
      setMessage("تعذّر الاتصال.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-card p-4">
      <div className="mb-3">
        <h3 className="text-sm font-extrabold">توجيه الشبكة والإرسال</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          النظام يختار الكراجات تلقائيًا ويضعها في طابور الإرسال. الاختيار وحده لا يُحسب كتواصل ناجح؛ يبدأ القياس الحقيقي عند الإرسال. ويمكن استخدام إنشاء ونسخ الرابط يدويًا كمسار احتياطي.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {workshops.map((workshop) => {
          const delivery = queue.find((item) => item.workshop_id === workshop.place_id);
          return (
            <li key={workshop.place_id} className="rounded-lg border border-border bg-background px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold">{workshop.name}</p>
                    {delivery && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                        #{delivery.target_rank} · {STATUS_LABELS[delivery.status]}
                      </span>
                    )}
                  </div>
                  {workshop.phone && <p dir="ltr" className="text-xs text-muted-foreground">{workshop.phone}</p>}
                  {delivery && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {delivery.selection_reason} · score {delivery.selection_score}
                    </p>
                  )}
                  {delivery?.last_error && <p className="mt-1 text-[11px] text-red-400">{delivery.last_error}</p>}
                </div>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => createLink(workshop)}
                  className="rounded-lg border border-[#FFD60A] px-3 py-1.5 text-xs font-extrabold text-[#FFD60A] disabled:opacity-50"
                >
                  {busyId === workshop.place_id ? "جارٍ الإنشاء..." : "إنشاء ونسخ الرابط"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {message && <p className="mt-3 break-all rounded-lg border border-border bg-background p-3 text-xs">{message}</p>}
    </div>
  );
}
