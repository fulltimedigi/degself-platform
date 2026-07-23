"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  QUOTE_STATUSES,
  statusMeta,
  pricingTypeMeta,
  PARTS_TYPE_LABEL,
  DEFAULT_VALIDITY_DAYS,
  type QuoteOffer,
  type PartsType,
} from "@/lib/quote-status";
import { validateOffer, type OfferErrors } from "@/lib/offer-validation";
import { StructuredOfferFields } from "@/components/StructuredOfferFields";

const OFFER_STATUS_LABEL: Record<string, string> = {
  pending: "بانتظار",
  accepted: "مقبول",
  rejected: "مرفوض",
};

const EMPTY_FORM = {
  workshop_name: "",
  workshop_phone: "",
  pricing_type: "fixed",
  price_kwd: "",
  price_max_kwd: "",
  assumed_diagnosis: "",
  inspection_fee_kwd: "",
  parts_type: "",
  validity_days: String(DEFAULT_VALIDITY_DAYS),
  warranty_days: "",
  warranty_note: "",
  estimated_duration: "",
  notes: "",
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
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);

  // Live validation — SAME rules the server enforces.
  const errs: OfferErrors = useMemo(() => {
    const res = validateOffer(form);
    return res.errors ?? {};
  }, [form]);
  const hasErrors = Object.keys(errs).length > 0;

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const markTouched = (name: string) => setTouched((t) => ({ ...t, [name]: true }));
  const showErr = (name: keyof OfferErrors) =>
    touched[name as string] || attempted ? errs[name] : undefined;

  const inputCls =
    "w-full rounded-lg border bg-background px-3 py-2.5 text-base focus:outline-none focus:border-[#FFD60A]";

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
    setAttempted(true);
    const res = validateOffer(form);
    if (res.errors) {
      setMsg({ kind: "err", text: Object.values(res.errors)[0] ?? "بيانات العرض غير صحيحة." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/quotes/${quoteId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg({ kind: "err", text: d.error ?? "تعذّر إضافة العرض." });
        return;
      }
      setForm({ ...EMPTY_FORM });
      setTouched({});
      setAttempted(false);
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

  async function copyGarageLink() {
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/garage-link`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ kind: "err", text: d.error ?? "تعذّر إنشاء رابط الكراجات." });
        return;
      }
      let copied = false;
      try {
        await navigator.clipboard.writeText(d.url);
        copied = true;
      } catch {
        /* clipboard may be blocked — the URL is still shown below */
      }
      setMsg({
        kind: "ok",
        text: `رابط تقديم العروض للكراجات${copied ? " (نُسخ للحافظة)" : ""}: ${d.url}`,
      });
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
          className={`${inputCls} border-border`}
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">العروض المستلمة ({offers.length})</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyGarageLink}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold transition hover:border-[#FFD60A]"
            >
              رابط الكراجات 🔗
            </button>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="rounded-lg bg-[#FFD60A] px-3 py-1.5 text-xs font-extrabold text-[#0A0A0A]"
            >
              {showForm ? "إلغاء" : "إضافة عرض جديد"}
            </button>
          </div>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          «رابط الكراجات» = لينك تبعته للكراجات على واتساب ليقدّموا عروضهم بأنفسهم (بدون دخول).
        </p>

        {showForm && (
          <form
            onSubmit={addOffer}
            className="mb-4 flex flex-col gap-3 rounded-lg border border-border bg-background p-3"
          >
            <StructuredOfferFields form={form} onChange={set} onBlur={markTouched} showError={showErr} />

            <button
              type="submit"
              disabled={busy || hasErrors}
              className="rounded-lg bg-[#FFD60A] px-4 py-2.5 text-sm font-extrabold text-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "جارٍ الحفظ..." : hasErrors ? "أكمل الحقول المطلوبة" : "حفظ العرض"}
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
                <OfferAdminRow offer={o} onDelete={() => deleteOffer(o.id)} />
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

// Admin-side summary of one received offer (shows all structured fields).
function OfferAdminRow({ offer: o, onDelete }: { offer: QuoteOffer; onDelete: () => void }) {
  const meta = pricingTypeMeta(o.pricing_type);
  const priceText =
    o.pricing_type === "range" && o.price_max_kwd != null
      ? `${o.price_kwd} – ${o.price_max_kwd} د.ك`
      : `${o.price_kwd} د.ك`;
  const parts =
    o.parts_type && PARTS_TYPE_LABEL[o.parts_type as PartsType]
      ? PARTS_TYPE_LABEL[o.parts_type as PartsType]
      : null;

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-bold">
          {o.workshop_name}
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.className}`}>
            {meta.badge}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
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
          <span className="font-extrabold text-[#FFD60A]">{priceText}</span>
          {o.estimated_duration && (
            <span className="text-muted-foreground"> · {o.estimated_duration}</span>
          )}
        </p>
        <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
          {o.pricing_type === "conditional" && o.assumed_diagnosis && (
            <span>التشخيص المرجّح: {o.assumed_diagnosis}</span>
          )}
          {o.pricing_type === "conditional" && o.inspection_fee_kwd != null && (
            <span>
              رسم الكشف: {o.inspection_fee_kwd > 0 ? `${o.inspection_fee_kwd} د.ك` : "مجاني"}
            </span>
          )}
          {parts && <span>قطع الغيار: {parts}</span>}
          {o.warranty_days != null && (
            <span>
              الضمان: {o.warranty_days} يوم{o.warranty_note ? ` — ${o.warranty_note}` : ""}
            </span>
          )}
          <span>صلاحية العرض: {o.validity_days} يوم</span>
        </div>
        {o.workshop_phone && (
          <a href={`tel:${o.workshop_phone}`} dir="ltr" className="font-mono text-xs text-[#FFD60A]">
            {o.workshop_phone}
          </a>
        )}
        {o.notes && <p className="mt-1 text-xs text-muted-foreground">{o.notes}</p>}
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 rounded-lg border border-red-500/40 px-2.5 py-1 text-xs font-bold text-red-400"
      >
        حذف
      </button>
    </div>
  );
}
