"use client";

import { useState } from "react";

type Workshop = {
  place_id: string;
  name: string;
  phone: string;
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
        // The URL is still displayed for manual copy when clipboard is blocked.
      }

      setMessage(
        `${workshop.name}: ${copied ? "تم إنشاء الرابط ونسخه" : "تم إنشاء الرابط"} — ${body.url}`
      );
    } catch {
      setMessage("تعذّر الاتصال.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-card p-4">
      <div className="mb-3">
        <h3 className="text-sm font-extrabold">تواصل قابل للقياس مع الكراجات</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          أنشئ رابطًا منفصلًا لكل كراج. إنشاء الرابط يُسجَّل كبدء تواصل؛ الفتح والرد يُسجَّلان تلقائيًا.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {workshops.map((workshop) => (
          <li
            key={workshop.place_id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{workshop.name}</p>
              {workshop.phone && (
                <p dir="ltr" className="text-xs text-muted-foreground">
                  {workshop.phone}
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={busyId !== null}
              onClick={() => createLink(workshop)}
              className="rounded-lg border border-[#FFD60A] px-3 py-1.5 text-xs font-extrabold text-[#FFD60A] disabled:opacity-50"
            >
              {busyId === workshop.place_id ? "جارٍ الإنشاء..." : "إنشاء ونسخ الرابط"}
            </button>
          </li>
        ))}
      </ul>

      {message && (
        <p className="mt-3 break-all rounded-lg border border-border bg-background p-3 text-xs">
          {message}
        </p>
      )}
    </div>
  );
}
