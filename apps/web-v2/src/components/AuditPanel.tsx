"use client";

import { useState } from "react";

const PW_KEY = "degself_mod_pw"; // shared with ModerationPanel

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

export function AuditPanel() {
  const [pw, setPw] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(PW_KEY);
  });
  const [pwInput, setPwInput] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [result, setResult] = useState<ApplyResponse | null>(null);
  const [loading, setLoading] = useState<"preview" | "apply" | null>(null);
  const [error, setError] = useState("");

  function authHeaders(): HeadersInit {
    return pw ? { Authorization: `Bearer ${pw}` } : {};
  }

  function logout() {
    sessionStorage.removeItem(PW_KEY);
    setPw(null);
    setPreview(null);
    setResult(null);
    setError("");
  }

  async function handlePwSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = pwInput.trim();
    if (!trimmed) return;
    // verify by hitting preview endpoint
    setLoading("preview");
    try {
      const res = await fetch("/api/admin/audit", {
        headers: { Authorization: `Bearer ${trimmed}` },
      });
      if (res.status === 401) {
        setError("كلمة سر غير صحيحة.");
        setLoading(null);
        return;
      }
      const data: PreviewResponse = await res.json();
      sessionStorage.setItem(PW_KEY, trimmed);
      setPw(trimmed);
      setPwInput("");
      setPreview(data);
    } catch (err) {
      setError(`خطأ في الاتصال: ${(err as Error).message}`);
    } finally {
      setLoading(null);
    }
  }

  async function loadPreview() {
    setError("");
    setLoading("preview");
    try {
      const res = await fetch("/api/admin/audit", { headers: authHeaders() });
      if (res.status === 401) {
        logout();
        setError("انتهت الجلسة. أعد إدخال كلمة السر.");
        return;
      }
      setPreview(await res.json());
    } catch (err) {
      setError(`خطأ: ${(err as Error).message}`);
    } finally {
      setLoading(null);
    }
  }

  async function applyAudit() {
    if (!confirm("تطبيق التدقيق على قاعدة البيانات؟ هذا الإجراء يحدّث حقول التدقيق فقط ولا يحذف بيانات.")) return;
    setError("");
    setResult(null);
    setLoading("apply");
    try {
      const res = await fetch("/api/admin/audit", {
        method: "POST",
        headers: authHeaders(),
      });
      if (res.status === 401) {
        logout();
        setError("انتهت الجلسة. أعد إدخال كلمة السر.");
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

  // ── login screen ───────────────────────────────────────────────
  if (!pw) {
    return (
      <form onSubmit={handlePwSubmit} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <label className="text-sm font-bold">كلمة سر المراجعة</label>
        <input
          type="password"
          value={pwInput}
          onChange={(e) => setPwInput(e.target.value)}
          autoFocus
          className="rounded-lg border border-border bg-background px-3 py-2 focus:border-primary focus:outline-none"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading === "preview"}
          className="self-end rounded-lg bg-primary px-5 py-2 font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {loading === "preview" ? "جارٍ التحقق..." : "دخول"}
        </button>
      </form>
    );
  }

  // ── panel ───────────────────────────────────────────────────────
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
        <button
          onClick={logout}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:bg-muted"
        >
          تغيير كلمة السر
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
