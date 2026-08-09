"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { PartnerLinkImporter } from "@/components/PartnerLinkImporter";

type OptInSource = "whatsapp" | "written" | "verbal" | "other";

type Row = {
  place_id: string;
  name: string;
  area: string | null;
  phone: string | null;
  phone_intl: string | null;
  reviewed_specialty: string | null;
  is_partner: boolean;
  partner_priority: number;
  partner_notes: string | null;
  google_rating: number | null;
  rfq_dispatch_enabled: boolean;
  rfq_opt_in_at: string | null;
  rfq_opt_in_source: OptInSource | null;
  rfq_phone_verified_at: string | null;
};

type PartnerPatch = Partial<
  Pick<Row, "is_partner" | "partner_priority" | "partner_notes" | "rfq_dispatch_enabled">
> & {
  rfq_opt_in_confirmed?: boolean;
  rfq_opt_in_source?: OptInSource | null;
  rfq_phone_verified?: boolean;
};

function metaLine(r: Row): string {
  const parts = [r.area, r.reviewed_specialty].filter(Boolean);
  if (r.google_rating != null) parts.push(`★ ${r.google_rating}`);
  return parts.join(" · ") || "—";
}

function sourceLabel(value: OptInSource | null): string {
  if (value === "written") return "موافقة مكتوبة";
  if (value === "verbal") return "موافقة شفوية";
  if (value === "other") return "مصدر آخر";
  return "واتساب";
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

  async function patch(place_id: string, updates: PartnerPatch) {
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

      setNetwork((prev) => prev.map((r) => (r.place_id === place_id ? { ...r, ...w } : r)));
    } catch {
      setError("تعذّر الاتصال");
    } finally {
      setBusyId(null);
    }
  }

  const count = network.length;
  const readyCount = network.filter((r) => r.rfq_dispatch_enabled).length;
  const consentCount = network.filter((r) => r.rfq_opt_in_at).length;
  const verifiedPhoneCount = network.filter((r) => r.rfq_phone_verified_at).length;

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">كراجات الشبكة</p>
            <p className="mt-1 text-2xl font-extrabold text-[#FFD60A]">{count}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">موافقة RFQ مسجلة</p>
            <p className="mt-1 text-2xl font-extrabold">{consentCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">رقم واتساب متحقق</p>
            <p className="mt-1 text-2xl font-extrabold">{verifiedPhoneCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">جاهز للتوجيه الآلي</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-400">{readyCount}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-3xl text-xs text-muted-foreground">
            إضافة الكراج للشبكة لا تفعّل إرسال طلبات الأسعار. لازم نسجل موافقته، نتحقق من رقم واتساب، ونفعّل RFQ يدوياً. WABA نفسها تظل لها مفتاح تشغيل مستقل.
          </p>
          <button
            type="button"
            onClick={() => void loadNetwork()}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-[#FFD60A]"
          >
            تحديث ↻
          </button>
        </div>
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
            افتح الكراج من دق سلف، انسخ رابط صفحته والصقه هنا. يضاف للشبكة فقط، ويبدأ RFQ مقفول افتراضياً حتى تكتمل قائمة الجاهزية.
          </p>
        </div>
        <PartnerLinkImporter onAdded={async () => loadNetwork()} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-extrabold">قائمة جاهزية كراجات RFQ</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            دي القائمة اللي هنجهزها قبل تشغيل WABA. الراوتر لا يختار أي كراج غير مفعّل هنا، حتى في الموجة الثالثة الاحتياطية.
          </p>
        </div>

        {networkLoading ? (
          <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>
        ) : count === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
            <p className="text-base font-extrabold">الشبكة فاضية حالياً</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              أول ما تتفق مع كراج، انسخ رابط صفحته من دق سلف والصقه فوق.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {network.map((r, idx) => {
              const busy = busyId === r.place_id;
              const phone = r.phone_intl || r.phone || "";
              const hasConsent = Boolean(r.rfq_opt_in_at);
              const phoneVerified = Boolean(r.rfq_phone_verified_at);
              const prerequisites = Boolean(phone && r.reviewed_specialty && hasConsent && phoneVerified);
              const selectedSource = r.rfq_opt_in_source ?? "whatsapp";

              return (
                <li
                  key={r.place_id}
                  className={`rounded-xl border px-4 py-3 ${
                    r.rfq_dispatch_enabled
                      ? "border-emerald-500/50 bg-emerald-500/5"
                      : "border-[#FFD60A]/30 bg-card"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold">
                        <span className="me-2 text-xs text-muted-foreground">#{idx + 1}</span>
                        {r.name}
                        <span className="ms-2 inline-flex items-center rounded-full bg-[#FFD60A]/15 px-2 py-0.5 text-[11px] font-extrabold text-[#FFD60A]">
                          ✓ شبكة
                        </span>
                        <span className={`ms-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                          r.rfq_dispatch_enabled
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-white/5 text-muted-foreground"
                        }`}>
                          {r.rfq_dispatch_enabled ? "RFQ جاهز" : "RFQ مقفول"}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {metaLine(r)}
                        {phone ? <><span>{" · "}</span><span dir="ltr">{phone}</span></> : null}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/partners/${r.place_id}`}
                        className="rounded-lg border border-[#FFD60A]/50 bg-[#FFD60A]/10 px-3 py-1.5 text-sm font-extrabold text-[#FFD60A] hover:bg-[#FFD60A]/15"
                      >
                        تعديل الصفحة والرقم
                      </Link>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void patch(r.place_id, { is_partner: false })}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm font-bold text-muted-foreground hover:border-red-500 hover:text-red-400 disabled:opacity-50"
                      >
                        إزالة من الشبكة
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                    <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={hasConsent}
                        disabled={busy}
                        onChange={(e) => void patch(r.place_id, {
                          rfq_opt_in_confirmed: e.target.checked,
                          rfq_opt_in_source: selectedSource,
                        })}
                      />
                      <span className="font-bold">موافقة استقبال RFQ مسجلة</span>
                    </label>

                    <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={phoneVerified}
                        disabled={busy || !phone}
                        onChange={(e) => void patch(r.place_id, { rfq_phone_verified: e.target.checked })}
                      />
                      <span className="font-bold">رقم واتساب متحقق</span>
                    </label>

                    <button
                      type="button"
                      disabled={busy || (!r.rfq_dispatch_enabled && !prerequisites)}
                      onClick={() => void patch(r.place_id, { rfq_dispatch_enabled: !r.rfq_dispatch_enabled })}
                      className={`rounded-lg px-4 py-2 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-40 ${
                        r.rfq_dispatch_enabled
                          ? "border border-red-500/50 text-red-400"
                          : "bg-emerald-500 text-black"
                      }`}
                    >
                      {r.rfq_dispatch_enabled ? "إيقاف RFQ" : "تفعيل RFQ"}
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-[220px_100px_1fr]">
                    <div>
                      <label className="mb-1 block text-[11px] text-muted-foreground">مصدر الموافقة</label>
                      <select
                        value={selectedSource}
                        disabled={busy}
                        onChange={(e) => {
                          const source = e.target.value as OptInSource;
                          if (hasConsent) {
                            void patch(r.place_id, { rfq_opt_in_confirmed: true, rfq_opt_in_source: source });
                          } else {
                            setNetwork((prev) => prev.map((x) => x.place_id === r.place_id ? { ...x, rfq_opt_in_source: source } : x));
                          }
                        }}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                      >
                        <option value="whatsapp">واتساب</option>
                        <option value="written">موافقة مكتوبة</option>
                        <option value="verbal">موافقة شفوية</option>
                        <option value="other">مصدر آخر</option>
                      </select>
                      {hasConsent && <p className="mt-1 text-[10px] text-muted-foreground">{sourceLabel(r.rfq_opt_in_source)}</p>}
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] text-muted-foreground">أولوية التوجيه</label>
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
                        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] text-muted-foreground">ملاحظات داخلية</label>
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
                        placeholder="مثال: وافق عبر واتساب بتاريخ… · متخصص تكييف…"
                      />
                    </div>
                  </div>

                  {!prerequisites && !r.rfq_dispatch_enabled && (
                    <p className="mt-3 text-xs text-amber-400">
                      قبل التفعيل: لازم رقم واتساب + تخصص مراجع + موافقة مسجلة + تحقق من الرقم.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
