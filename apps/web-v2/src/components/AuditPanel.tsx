"use client";

import { useEffect, useState } from "react";

interface PreviewResponse {
  total_in_audit_file: number;
  flags: Record<string, number>;
  non_automotive: number;
  out_of_scope: number;
}

interface ApplyResponse {
  ok: boolean;
  updated: number;
  failed: number;
  visible_after: number | null;
  failures: { place_id: string; error: string }[];
}

// Relies on the httpOnly admin_session cookie from /admin/login. No password
// prompt / sessionStorage / Bearer headers.
export function AuditPanel() {
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [result, setResult] = useState<ApplyResponse | null>(null);
  const [loading, setLoading] = useState<"preview" | "apply" | null>(null);
  const [error, setError] = useState("");

  async function loadPreview() {
    setError("");
    setLoading("preview");
    try {
      const res = await fetch("/api/admin/audit", { credentials: "same-origin" });
      if (res.status === 401) {
        setError("انتهت الجلسة. أعد تسجيل الدخول من /admin/login.");
        return;
      }
      setPreview(await res.json());
    } catch (err) {
      setError(`خطأ: ${(err as Error).message}`);
    } finally {
      setLoading(null);
    }
  }

  useEffect(() => {
    void loadPreview();
  }, []);

  async function applyAudit() {
    if (!confirm("تطبيق التدقيق على قاعدة البيانات؟ هذا الإجراء يحدّث حقول التدقيق فقط ولا يحذف بيانات.")) return;
    setError("");
    setResult(null);
    setLoading("apply");
    try {
      const res = await fetch("/api/admin/audit", {
        method: "POST",
        credentials: "same-origin",
      });
      if (res.status === 401) {
        setError("انتهت الجلسة. أعد تسجيل الدخول من /admin/login.");
        return;
      }
      const data: ApplyResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError(`خطأ: ${(err as Error).message}`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={loadPreview}
          disabled={loading !== null}
          className="rounded-lg border border-primary/40 px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/10 disabled:opacity-50"
        >
          {loading === "preview" ? "جارٍ القراءة..." : "تحديث المعاينة"}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {preview && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-base font-extrabold">ملخّص ملف التدقيق</h2>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="إجمالي السجلات" value={preview.total_in_audit_file} />
            <Stat label="غير سيارات" value={preview.non_automotive} accent />
            <Stat label="خارج النطاق" value={preview.out_of_scope} accent />
            <Stat
              label="ستظل ظاهرة"
              value={preview.total_in_audit_file - preview.non_automotive - preview.out_of_scope}
            />
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-muted-foreground">تفصيل العلامات</summary>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs">
              {JSON.stringify(preview.flags, null, 2)}
            </pre>
          </details>

          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-3 text-sm text-muted-foreground">
              عند الضغط على «تطبيق»، يُحدَّث حقل <code>reviewed_specialty</code>
              + <code>is_automotive</code> + <code>out_of_scope</code> لكل
              السجلات أعلاه. لا يُحذف ولا يُعدَّل الحقل الأصلي.
            </p>
            <button
              onClick={applyAudit}
              disabled={loading !== null}
              className="rounded-lg bg-red-600 px-6 py-2.5 font-bold text-white shadow-md transition hover:bg-red-700 disabled:opacity-50"
            >
              {loading === "apply" ? "جارٍ التطبيق... قد يستغرق دقيقة" : "تطبيق التدقيق"}
            </button>
          </div>
        </section>
      )}

      {result && (
        <section className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <h2 className="mb-3 text-base font-extrabold text-primary">نتيجة التطبيق</h2>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Stat label="تم التحديث" value={result.updated} />
            <Stat label="فشل" value={result.failed} accent={result.failed > 0} />
            <Stat label="ظاهرة الآن" value={result.visible_after ?? "—"} />
          </div>
          {result.failures.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-red-500">عيّنة الإخفاقات</summary>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs">
                {JSON.stringify(result.failures, null, 2)}
              </pre>
            </details>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border ${accent ? "border-primary/40 bg-primary/10" : "border-border bg-background"} px-3 py-2`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-extrabold">{value}</div>
    </div>
  );
}
