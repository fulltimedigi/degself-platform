"use client";

import { useCallback, useEffect, useState } from "react";
import { PartnerLinkImporter } from "@/components/PartnerLinkImporter";

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

      if (updates.is_partner === false) {
        setNetwork((prev) => prev.filter((r) => r.place_id !== place_id));
        return;
      }

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

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">عدد كراجات الشبكة</p>
            <p className="mt-1 text-2xl font-extrabold text-[#FFD60A]">{count}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadNetwork()}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-[#FFD60A]"
          >
            تحديث ↻
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          الشبكة مفتوحة بدون حد أقصى. أي كراج تضيفه هنا يصبح كراج شبكة موثق، ويكون مؤهلاً للأولوية والتوجيه الآلي لطلبات عروض الأسعار.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-extrabold">أضف كراج للشبكة</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            افتح الكراج من دق سلف، انسخ رابط صفحته والصقه هنا. النظام يطابقه مع الدليل الأساسي ويضيفه مباشرة للشبكة بدون إعادة إدخال بيانات.
          </p>
        </div>
        <PartnerLinkImporter onAdded={async () => loadNetwork()} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-extrabold">كراجات الشبكة</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            مصدر الحقيقة للكراجات الموثقة التي نفضّلها في المنصة ونستخدمها لاحقاً في التوجيه الآلي لطلبات عروض الأسعار.
          </p>
        </div>

        {networkLoading ? (
          <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>
        ) : count === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
            <p className="text-base font-extrabold">الشبكة فاضية حالياً</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              أول ما تتفق مع كراج، انسخ رابط صفحته من دق سلف والصقه فوق. مفيش حد أقصى لعدد كراجات الشبكة.
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
                        <span className="me-2 text-xs text-muted-foreground">#{idx + 1}</span>
                        {r.name}
                        <span className="ms-2 inline-flex items-center rounded-full bg-[#FFD60A]/15 px-2 py-0.5 text-[11px] font-extrabold text-[#FFD60A]">
                          ✓ موثق
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {metaLine(r)}
                        {r.phone ? <><span>{" · "}</span><span dir="ltr">{r.phone}</span></> : null}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void patch(r.place_id, { is_partner: false })}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm font-bold text-muted-foreground hover:border-red-500 hover:text-red-400 disabled:opacity-50"
                    >
                      إزالة من الشبكة
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] text-muted-foreground">
                        أولوية التوجيه
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
                        ملاحظات داخلية
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
                        placeholder="مثال: يرد واتساب بسرعة · متخصص تكييف…"
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
