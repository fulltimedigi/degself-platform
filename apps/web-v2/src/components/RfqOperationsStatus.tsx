"use client";

import { useEffect, useState } from "react";

type Readiness = {
  config: {
    whatsapp_enabled: boolean;
    token_configured: boolean;
    phone_number_id_configured: boolean;
    garage_template_configured: boolean;
    webhook_verify_token_configured: boolean;
    app_secret_configured: boolean;
    cron_secret_configured: boolean;
  };
  partners: { total: number; consented: number; phone_verified: number; rfq_ready: number };
  provider_configured: boolean;
  scheduler_configured: boolean;
  activation_ready: boolean;
  sending_active: boolean;
};

function Mark({ ok }: { ok: boolean }) {
  return <span className={ok ? "text-emerald-400" : "text-muted-foreground"}>{ok ? "✓" : "○"}</span>;
}

export function RfqOperationsStatus() {
  const [data, setData] = useState<Readiness | null>(null);
  const [error, setError] = useState("");
  const [templateSetup, setTemplateSetup] = useState<
    | { state: "idle" }
    | { state: "submitting" }
    | { state: "success"; reviewStatus: string }
    | { state: "error"; message: string }
  >({ state: "idle" });

  async function submitTemplate() {
    setTemplateSetup({ state: "submitting" });
    try {
      const response = await fetch("/api/admin/whatsapp-garage-template-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "garage_quote_request_ar" }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            status?: string;
            provider_error_code?: number;
            provider_error_subcode?: number;
            provider_error_hint?: string;
            template?: { review_status?: string };
          }
        | null;
      if (!response.ok || !body?.ok) {
        const codes = [body?.provider_error_code, body?.provider_error_subcode]
          .filter((value): value is number => typeof value === "number")
          .join("/");
        throw new Error(
          `${body?.status || "template_submission_failed"}${codes ? ` (${codes})` : ""}${body?.provider_error_hint ? ` — hint:${body.provider_error_hint}` : ""}`
        );
      }
      setTemplateSetup({
        state: "success",
        reviewStatus: body.template?.review_status || "PENDING",
      });
    } catch (e) {
      setTemplateSetup({
        state: "error",
        message: e instanceof Error ? e.message : "template_submission_failed",
      });
    }
  }

  useEffect(() => {
    fetch("/api/admin/rfq-readiness", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "تعذّر فحص الجاهزية");
        setData(body as Readiness);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "تعذّر فحص الجاهزية"));
  }, []);

  if (error) return <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>;
  if (!data) return <div className="mb-6 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">جارٍ فحص جاهزية RFQ / WABA…</div>;

  const checks = [
    ["Meta access token", data.config.token_configured],
    ["WhatsApp Phone Number ID", data.config.phone_number_id_configured],
    ["Garage RFQ template", data.config.garage_template_configured],
    ["Webhook verify token", data.config.webhook_verify_token_configured],
    ["Meta app secret", data.config.app_secret_configured],
    ["Scheduler secret", data.config.cron_secret_configured],
  ] as const;

  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-extrabold">جاهزية تشغيل RFQ / WABA</h2>
          <p className="mt-1 text-xs text-muted-foreground">الفحص يعرض وجود الإعدادات فقط ولا يعرض أي سر أو token.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${data.sending_active ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"}`}>
          {data.sending_active ? "WABA ON" : "WABA OFF — آمن"}
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5 text-sm">
          {checks.map(([label, ok]) => (
            <div key={label} className="flex items-center gap-2"><Mark ok={ok} /><span>{label}</span></div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="rounded-lg border border-border p-2"><div className="text-lg font-extrabold">{data.partners.total}</div><div className="text-muted-foreground">شركاء</div></div>
          <div className="rounded-lg border border-border p-2"><div className="text-lg font-extrabold">{data.partners.consented}</div><div className="text-muted-foreground">موافقة</div></div>
          <div className="rounded-lg border border-border p-2"><div className="text-lg font-extrabold">{data.partners.phone_verified}</div><div className="text-muted-foreground">رقم متحقق</div></div>
          <div className="rounded-lg border border-border p-2"><div className="text-lg font-extrabold text-emerald-400">{data.partners.rfq_ready}</div><div className="text-muted-foreground">RFQ جاهز</div></div>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {data.activation_ready
          ? "كل المتطلبات التقنية الأساسية موجودة ويوجد كراج جاهز؛ يظل الإرسال متوقفاً حتى التفعيل المقصود لـ WHATSAPP_ENABLED."
          : "التشغيل غير جاهز بعد. أكمل العناصر الناقصة والقائمة أولاً؛ الإرسال يظل مقفولاً."}
      </p>

      <div className="mt-4 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3">
        <p className="text-xs text-amber-100">
          إجراء مؤقت: يرسل قالب <span dir="ltr">garage_quote_request_ar</span> الثابت إلى Meta للمراجعة فقط؛ لا يفعّل واتساب ولا يرسل رسائل.
        </p>
        <button
          type="button"
          onClick={submitTemplate}
          disabled={templateSetup.state === "submitting" || templateSetup.state === "success"}
          className="mt-3 rounded-lg bg-[#FFD60A] px-4 py-2 text-sm font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {templateSetup.state === "submitting" ? "جارٍ الإرسال إلى Meta…" : "إرسال القالب للمراجعة"}
        </button>
        <p className="mt-2 text-xs" aria-live="polite">
          {templateSetup.state === "success" && `تم الإرسال بنجاح — الحالة: ${templateSetup.reviewStatus}`}
          {templateSetup.state === "error" && `تعذّر الإرسال — ${templateSetup.message}`}
        </p>
      </div>
    </section>
  );
}
