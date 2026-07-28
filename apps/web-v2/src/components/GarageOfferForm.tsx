"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { DEFAULT_VALIDITY_DAYS } from "@/lib/quote-status";
import { validateOffer, type OfferErrors } from "@/lib/offer-validation";
import { StructuredOfferFields } from "@/components/StructuredOfferFields";

const EMPTY = {
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

export function GarageOfferForm({ token }: { token: string }) {
  const t = useTranslations();
  const [form, setForm] = useState({ ...EMPTY });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [done, setDone] = useState(false);

  const errs: OfferErrors = useMemo(() => validateOffer(form).errors ?? {}, [form]);
  const hasErrors = Object.keys(errs).length > 0;

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const mark = (name: string) => setTouched((prev) => ({ ...prev, [name]: true }));
  const showErr = (name: keyof OfferErrors) =>
    touched[name as string] || attempted ? errs[name] : undefined;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    const res = validateOffer(form);
    if (res.errors) {
      setMsg({ kind: "err", text: Object.values(res.errors)[0] ?? t("submit.completeFields") });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/submit-offer/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg({ kind: "err", text: d.error ?? t("submit.sendError") });
        return;
      }
      setDone(true);
    } catch {
      setMsg({ kind: "err", text: t("offers.connError") });
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border-2 border-[#FFD60A] bg-card p-8 text-center">
        <p className="mb-3 text-4xl">✅</p>
        <p className="mb-2 text-lg font-extrabold">{t("submit.doneTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("submit.doneBody")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <StructuredOfferFields form={form} onChange={set} onBlur={mark} showError={showErr} />

      {msg && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            msg.kind === "ok"
              ? "border-green-500/40 bg-green-500/10 text-green-400"
              : "border-red-500/40 bg-red-500/10 text-red-400"
          }`}
        >
          {msg.text}
        </div>
      )}

      <button
        type="submit"
        disabled={busy || hasErrors}
        className="mt-1 rounded-lg bg-[#FFD60A] px-4 py-3.5 text-base font-extrabold text-[#0A0A0A] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? t("submit.submitting") : hasErrors ? t("submit.completeFields") : t("submit.submit")}
      </button>
    </form>
  );
}
