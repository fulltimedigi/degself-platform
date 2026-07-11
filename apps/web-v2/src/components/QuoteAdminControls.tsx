"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QUOTE_STATUSES, statusMeta, type QuoteOffer } from "@/lib/quote-status";

const OFFER_STATUS_LABEL: Record<string, string> = {
  pending: "بانتظار",
  accepted: "مقبول",
  rejected: "مرفوض",
};

function Banner({ kind, children }: { kind: "ok" | "err"; children: React.ReactNode }) {
  const cls =
    kind === "ok"
      ? "border-green-500/40 bg-green-500/10 text-green-400"
      : "border-red-500/40 bg-red-500/10 text-red-400";
  return <div className={`rounded-lg border p-3 text-sm ${cls}`}>{children}</div>;
}

export function QuoteAdminControls({
  quoteId,
  initialStatus,
  offers,
}: {
  quoteId: string;
  initialStatus: string;
  offers: QuoteOffer[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // add-offer form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    workshop_name: "",
    workshop_phone: "",
    price_kwd: "",
    estimated_duration: "",
    notes: "",
  });

  async function changeStatus(next: string) {
    const prev = status;
    setStatus(next); // optimistic
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setStatus(prev);
        setMsg({ kind: "err", text: d.error ?? "تعذّر تحديث الحالة." });
        return;
      }
      setMsg({ kind: "ok", text: "تم تحديث الحالة." });
      router.refresh();
    } catch {
      setStatus(prev);
      setMsg({ kind: "err", text: "تعذّر الاتصال." });
    }
  }

  async function addOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!form.workshop_name.trim()) {
      setMsg({ kind: "err", text: "اكتب اسم الكراج." });
      return;
    }
    if (!form.price_kwd.trim() || !Number.isFinite(Number(form.price_kwd))) {
      setMsg({ kind: "err", text: "اكتب سعراً صحيحاً." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ kind: "err", text: d.error ?? "تعذّر إضافة العرض." });
        return;
      }
      setForm({ workshop_name: "", workshop_phone: "", price_kwd: "", estimated_duration: "", notes: "" });
      setShowForm(false);
      setMsg({ kind: "ok", text: "أُضيف العرض." });
      router.refresh();
    } catch {
      setMsg({ kind: "err", text: "تعذّر الاتصال." });
    } finally {
      setBusy(false);
    }
  }

  async function deleteOffer(offerId: string) {
    if (!window.confirm("حذف هذا العرض؟")) return;
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/offers/${offerId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setMsg({ kind: "err", text: d.error ?? "تعذّر حذف العرض." });
        return;
      }
      setMsg({ kind: "ok", text: "حُذف العرض." });
      router.refresh();
    } catch {
      setMsg({ kind: "err", text: "تعذّر الاتصال." });
    }
  }

  async function sendOffers() {
    if (!window.confirm("سيتم إرسال رسالة واتساب للعميل بجميع العروض. متابعة؟")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/send-offers`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ kind: "err", text: d.error ?? "تعذّر إرسال العروض." });
        return;
      }
      // Copy the customer link to the clipboard for easy forwarding.
      let copied = false;
      try {
        await navigator.clipboard.writeText(d.url);
        copied = true;
      } catch {
        /* clipboard may be blocked — the URL is still shown below */
      }
      setStatus("offers_sent");
      setMsg({
        kind: "ok",
        text: `تم إنشاء رابط العروض${copied ? " ونُسخ للحافظة" : ""}: ${d.url}`,
      });
      router.refresh();
    } catch {
      setMsg({ kind: "err", text: "تعذّر الاتصال." });
    } finally {
      setBusy(false);
    }
  }

  const sm = statusMeta(status);
  const canSend = offers.length >= 1 && status !== "offers_sent" && status !== "accepted";
  const inputCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base focus:border-[#FFD60A] focus:outline-none";

  return (
    <div className="flex flex-col gap-6">
      {/* ── Status control ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-muted-foreground">حالة الطلب</h2>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${sm.className}`}>
            {sm.label}
          </span>
        </div>
        <select
          value={status}
          onChange={(e) => changeStatus(e.target.value)}
          className={inputCls}
        >
          {QUOTE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusMeta(s).label}
            </option>
          ))}
        </select>
      </section>

      {msg && <Banner kind={msg.kind}>{msg.text}</Banner>}

      {/* ── Offers ─────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-bold">العروض المستلمة ({offers.length})</h2>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-[#FFD60A] px-3 py-1.5 text-xs font-extrabold text-[#0A0A0A]"
          >
            {showForm ? "إلغاء" : "إضافة عرض جديد"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={addOffer} className="mb-4 flex flex-col gap-3 rounded-lg border border-border bg-background p-3">
            <input
              className={inputCls}
              placeholder="اسم الكراج *"
              value={form.workshop_name}
              onChange={(e) => setForm({ ...form, workshop_name: e.target.value })}
              maxLength={120}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                className={inputCls}
                inputMode="decimal"
                placeholder="السعر (د.ك) *"
                value={form.price_kwd}
                onChange={(e) => setForm({ ...form, price_kwd: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="المدة (مثال: ٣ أيام)"
                value={form.estimated_duration}
                onChange={(e) => setForm({ ...form, estimated_duration: e.target.value })}
                maxLength={60}
              />
            </div>
            <input
              className={inputCls}
              dir="ltr"
              placeholder="هاتف الكراج (اختياري)"
              value={form.workshop_phone}
              onChange={(e) => setForm({ ...form, workshop_phone: e.target.value })}
              maxLength={20}
            />
            <textarea
              className={inputCls}
              placeholder="ملاحظات (قطع مشمولة، ضمان…)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              maxLength={500}
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[#FFD60A] px-4 py-2.5 text-sm font-extrabold text-[#0A0A0A] disabled:opacity-60"
            >
              {busy ? "جارٍ الحفظ..." : "حفظ العرض"}
            </button>
          </form>
        )}

        {offers.length === 0 ? (
          <p className="rounded-lg border border-border bg-background p-4 text-center text-sm text-muted-foreground">
            لا توجد عروض بعد — اضغط إضافة عرض جديد
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {offers.map((o) => (
              <li key={o.id} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">
                      {o.workshop_name}
                      <span
                        className={`mx-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          o.status === "accepted"
                            ? "bg-green-600 text-white"
                            : o.status === "rejected"
                            ? "bg-neutral-600 text-white"
                            : "bg-neutral-700 text-white"
                        }`}
                      >
                        {OFFER_STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-extrabold text-[#FFD60A]">{o.price_kwd} د.ك</span>
                      {o.estimated_duration && (
                        <span className="text-muted-foreground"> · {o.estimated_duration}</span>
                      )}
                    </p>
                    {o.workshop_phone && (
                      <a href={`tel:${o.workshop_phone}`} dir="ltr" className="font-mono text-xs text-[#FFD60A]">
                        {o.workshop_phone}
                      </a>
                    )}
                    {o.notes && <p className="mt-1 text-xs text-muted-foreground">{o.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteOffer(o.id)}
                    className="shrink-0 rounded-lg border border-red-500/40 px-2.5 py-1 text-xs font-bold text-red-400"
                  >
                    حذف
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Send to customer ───────────────────────────────────────── */}
      {canSend && (
        <button
          type="button"
          onClick={sendOffers}
          disabled={busy}
          className="rounded-xl bg-[#FFD60A] px-4 py-4 text-base font-extrabold text-[#0A0A0A] transition hover:brightness-95 disabled:opacity-60"
        >
          {busy ? "جارٍ الإرسال..." : "إرسال العروض للعميل"}
        </button>
      )}
    </div>
  );
}
