"use client";

import { useCallback, useEffect, useState } from "react";

type Row = {
  place_id: string;
  name: string;
  area: string | null;
  phone: string | null;
  reviewed_specialty: string | null;
  is_partner: boolean;
  partner_priority: number;
  partner_notes: string | null;
  google_rating: number | null;
};

export function AdminPartnersClient() {
  const [q, setQ] = useState("");
  const [partnersOnly, setPartnersOnly] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (partnersOnly) params.set("partners_only", "1");
      const res = await fetch(`/api/admin/partners?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "تعذّر التحميل");
        setRows([]);
        return;
      }
      setRows(data.workshops ?? []);
    } catch {
      setError("تعذّر الاتصال");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, partnersOnly]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 250);
    return () => window.clearTimeout(t);
  }, [load]);

  async function patch(
    place_id: string,
    updates: Partial<Pick<Row, "is_partner" | "partner_priority" | "partner_notes">>
  ) {
    setBusyId(place_id);
    setError("");
    try {
      const res = await fetch("/api/admin/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id, ...updates }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "تعذّر الحفظ");
        return;
      }
      const w = data.workshop as Row;
      setRows((prev) =>
        prev.map((r) =>
          r.place_id === place_id
            ? {
                ...r,
                is_partner: w.is_partner,
                partner_priority: w.partner_priority,
                partner_notes: w.partner_notes,
              }
            : r
        )
      );
    } catch {
      setError("تعذّر الاتصال");
    } finally {
      setBusyId(null);
    }
  }

  const partnerCount = rows.filter((r) => r.is_partner).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-bold text-muted-foreground">
            بحث بالاسم / المنطقة / الهاتف
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-[#FFD60A] focus:outline-none"
            placeholder="مثال: الشويخ، تويوتا، ميكانيكا…"
          />
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={partnersOnly}
            onChange={(e) => setPartnersOnly(e.target.checked)}
          />
          الشركاء فقط
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold hover:border-[#FFD60A]"
        >
          تحديث ↻
        </button>
      </div>

      <p className="text-sm text-muted-foreground">
        المعروض: <span className="font-bold text-foreground">{rows.length}</span>
        {" · "}
        شركاء في هذه الصفحة:{" "}
        <span className="font-bold text-[#FFD60A]">{partnerCount}</span>
        {" · "}
        الهدف تقريباً ٥٠ شريك لشات concierge
      </p>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا نتائج.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const busy = busyId === r.place_id;
            return (
              <li
                key={r.place_id}
                className={`rounded-xl border px-4 py-3 ${
                  r.is_partner
                    ? "border-[#FFD60A]/50 bg-[#FFD60A]/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">{r.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[r.area, r.reviewed_specialty].filter(Boolean).join(" · ") || "—"}
                      {r.google_rating != null ? ` · ★ ${r.google_rating}` : ""}
                      {r.phone ? (
                        <>
                          {" · "}
                          <span dir="ltr">{r.phone}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void patch(r.place_id, { is_partner: !r.is_partner })
                    }
                    className={`rounded-lg px-3 py-1.5 text-sm font-bold transition disabled:opacity-50 ${
                      r.is_partner
                        ? "bg-[#FFD60A] text-[#0A0A0A]"
                        : "border border-border hover:border-[#FFD60A]"
                    }`}
                  >
                    {r.is_partner ? "شريك ✓" : "اجعله شريكاً"}
                  </button>
                </div>

                {r.is_partner && (
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] text-muted-foreground">
                        الأولوية (أعلى = يُفضَّل)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        defaultValue={r.partner_priority}
                        disabled={busy}
                        onBlur={(e) => {
                          const n = Number(e.target.value);
                          if (!Number.isFinite(n) || n === r.partner_priority) return;
                          void patch(r.place_id, { partner_priority: n });
                        }}
                        className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="min-w-[200px] flex-1">
                      <label className="mb-1 block text-[11px] text-muted-foreground">
                        ملاحظات داخلية
                      </label>
                      <input
                        type="text"
                        defaultValue={r.partner_notes ?? ""}
                        disabled={busy}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v === (r.partner_notes ?? "")) return;
                          void patch(r.place_id, { partner_notes: v || null });
                        }}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                        placeholder="مثال: يرد بسرعة، متخصص تويوتا…"
                      />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
