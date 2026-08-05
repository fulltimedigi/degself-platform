"use client";

/**
 * Partner network roster — starts empty; founder adds garages one-by-one
 * after field visits. Search pulls from the full directory; "أضف للشبكة"
 * flips is_partner=true.
 */

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

const TARGET = 50;

function metaLine(r: Row): string {
  const parts = [r.area, r.reviewed_specialty].filter(Boolean);
  if (r.google_rating != null) parts.push(`★ ${r.google_rating}`);
  return parts.join(" · ") || "—";
}

export function AdminPartnersClient() {
  const [network, setNetwork] = useState<Row[]>([]);
  const [networkLoading, setNetworkLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Directory search → candidates to add
  const [addQ, setAddQ] = useState("");
  const [candidates, setCandidates] = useState<Row[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTouched, setSearchTouched] = useState(false);

  const loadNetwork = useCallback(async () => {
    setNetworkLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/partners?partners_only=1");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "تعذّر تحميل الشبكة");
        setNetwork([]);
        return;
      }
      setNetwork(data.workshops ?? []);
    } catch {
      setError("تعذّر الاتصال");
      setNetwork([]);
    } finally {
      setNetworkLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNetwork();
  }, [loadNetwork]);

  // Debounced directory search (only when typing)
  useEffect(() => {
    const q = addQ.trim();
    if (q.length < 2) {
      setCandidates([]);
      setSearchLoading(false);
      return;
    }
    setSearchTouched(true);
    setSearchLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q });
        const res = await fetch(`/api/admin/partners?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "تعذّر البحث");
          setCandidates([]);
          return;
        }
        // Prefer non-partners first in the add picker
        const list = (data.workshops as Row[] | undefined) ?? [];
        setCandidates(
          [...list].sort((a, b) => Number(a.is_partner) - Number(b.is_partner))
        );
      } catch {
        setError("تعذّر الاتصال");
        setCandidates([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [addQ]);

  async function patch(
    place_id: string,
    updates: Partial<Pick<Row, "is_partner" | "partner_priority" | "partner_notes">>,
    opts?: { afterAdd?: boolean }
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

      if (updates.is_partner === true || opts?.afterAdd) {
        // Added → refresh roster + mark candidate as partner
        setCandidates((prev) =>
          prev.map((r) =>
            r.place_id === place_id
              ? {
                  ...r,
                  is_partner: true,
                  partner_priority: w.partner_priority,
                  partner_notes: w.partner_notes,
                }
              : r
          )
        );
        await loadNetwork();
        return;
      }

      if (updates.is_partner === false) {
        setNetwork((prev) => prev.filter((r) => r.place_id !== place_id));
        setCandidates((prev) =>
          prev.map((r) =>
            r.place_id === place_id ? { ...r, is_partner: false } : r
          )
        );
        return;
      }

      // Priority / notes update on existing partner
      setNetwork((prev) =>
        prev.map((r) =>
          r.place_id === place_id
            ? {
                ...r,
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

  const count = network.length;
  const progress = Math.min(100, Math.round((count / TARGET) * 100));

  return (
    <div className="space-y-8">
      {/* Progress */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm">
            شبكتك الآن:{" "}
            <span className="text-lg font-extrabold text-[#FFD60A]">{count}</span>
            <span className="text-muted-foreground"> / {TARGET}</span>
          </p>
          <button
            type="button"
            onClick={() => void loadNetwork()}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-[#FFD60A]"
          >
            تحديث ↻
          </button>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-[#FFD60A] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          ابدأ فاضي — كل ما تنزل وتتفق مع كراج، ابحث عنه تحت وأضفه هنا. الشات
          يفضّل الشبكة؛ لو فاضية يرجع للدليل العادي مؤقتاً.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Add from directory */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-extrabold">أضف كراج للشبكة</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            ابحث في الدليل (~١٨٠٠ كراج) بالاسم أو المنطقة أو الهاتف، ثم اضغط «أضف
            للشبكة».
          </p>
        </div>
        <input
          value={addQ}
          onChange={(e) => setAddQ(e.target.value)}
          className="w-full rounded-lg border border-border bg-card px-3 py-3 text-base focus:border-[#FFD60A] focus:outline-none"
          placeholder="مثال: كراج أحمد · الشويخ · ٩٩XXXXXX"
          autoComplete="off"
        />

        {searchLoading && (
          <p className="text-sm text-muted-foreground">جارٍ البحث…</p>
        )}

        {!searchLoading && addQ.trim().length >= 2 && candidates.length === 0 && searchTouched && (
          <p className="text-sm text-muted-foreground">
            ما لقينا كراج بهذا الاسم. تأكد من الإملاء، أو بلّغ عن كراج ناقص من
            الموقع العام.
          </p>
        )}

        {candidates.length > 0 && (
          <ul className="flex flex-col gap-2">
            {candidates.map((r) => {
              const busy = busyId === r.place_id;
              return (
                <li
                  key={r.place_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">{r.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {metaLine(r)}
                      {r.phone ? (
                        <>
                          {" · "}
                          <span dir="ltr">{r.phone}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  {r.is_partner ? (
                    <span className="rounded-lg bg-[#FFD60A]/15 px-3 py-1.5 text-sm font-bold text-[#FFD60A]">
                      موجود في الشبكة ✓
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void patch(r.place_id, { is_partner: true }, { afterAdd: true })
                      }
                      className="rounded-lg bg-[#FFD60A] px-3 py-1.5 text-sm font-extrabold text-[#0A0A0A] hover:bg-yellow-300 disabled:opacity-50"
                    >
                      {busy ? "…" : "أضف للشبكة"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Empty / growing roster */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-extrabold">كراجات الشبكة</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            القائمة اللي يوجّه لها الشات طلبات عروض الأسعار — تتكبر أول بأول.
          </p>
        </div>

        {networkLoading ? (
          <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>
        ) : count === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
            <p className="text-base font-extrabold">الشبكة فاضية حالياً</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              هذا المكان المقصود — كل ما تتفق مع كراج بعد النزول أو المكالمة،
              ابحث عنه فوق واضغط «أضف للشبكة». مفيش ضغط تكمل ٥٠ دفعة واحدة.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {network.map((r, idx) => {
              const busy = busyId === r.place_id;
              return (
                <li
                  key={r.place_id}
                  className="rounded-xl border border-[#FFD60A]/40 bg-[#FFD60A]/5 px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold">
                        <span className="me-2 text-xs text-muted-foreground">
                          #{idx + 1}
                        </span>
                        {r.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {metaLine(r)}
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
                        void patch(r.place_id, { is_partner: false })
                      }
                      className="rounded-lg border border-border px-3 py-1.5 text-sm font-bold text-muted-foreground hover:border-red-500 hover:text-red-400 disabled:opacity-50"
                    >
                      إزالة
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] text-muted-foreground">
                        الأولوية (أعلى = يُفضَّل أولاً)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        key={`${r.place_id}-prio-${r.partner_priority}`}
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
                        ملاحظات متابعة (داخلية)
                      </label>
                      <input
                        type="text"
                        key={`${r.place_id}-notes-${r.partner_notes ?? ""}`}
                        defaultValue={r.partner_notes ?? ""}
                        disabled={busy}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v === (r.partner_notes ?? "")) return;
                          void patch(r.place_id, { partner_notes: v || null });
                        }}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                        placeholder="مثال: زرتُه ٢/٣ · وافق · يرد واتساب بسرعة…"
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
