"use client";

import { useState } from "react";

const MIN_LEN = 8;
const inputCls =
  "w-full rounded-lg border border-border bg-card px-3 py-3 text-base focus:border-[#FFD60A] focus:outline-none";

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "sending">("idle");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Live client-side mirror of the server rules (server is authoritative).
  const tooShort = next.length > 0 && next.length < MIN_LEN;
  const mismatch = confirm.length > 0 && next !== confirm;
  const sameAsCurrent = next.length > 0 && next === current;
  const canSubmit =
    !!current && next.length >= MIN_LEN && next === confirm && next !== current && status !== "sending";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("sending");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next, confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error ?? "تعذّر تغيير كلمة السر." });
        return;
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      setMsg({ kind: "ok", text: "تم تغيير كلمة السر. استخدمها في الدخول القادم." });
    } catch {
      setMsg({ kind: "err", text: "تعذّر الاتصال، تأكد من الإنترنت." });
    } finally {
      setStatus("idle");
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-bold">كلمة السر الحالية</label>
        <input
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={inputCls}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold">كلمة السر الجديدة</label>
        <input
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={`${inputCls} ${tooShort || sameAsCurrent ? "border-red-500" : ""}`}
        />
        {tooShort && (
          <p className="mt-1 text-xs font-bold text-red-400">
            على الأقل {MIN_LEN} أحرف.
          </p>
        )}
        {sameAsCurrent && (
          <p className="mt-1 text-xs font-bold text-red-400">
            يجب أن تختلف عن الكلمة الحالية.
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold">تأكيد كلمة السر الجديدة</label>
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={`${inputCls} ${mismatch ? "border-red-500" : ""}`}
        />
        {mismatch && (
          <p className="mt-1 text-xs font-bold text-red-400">التأكيد لا يطابق.</p>
        )}
      </div>

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
        disabled={!canSubmit}
        className="rounded-lg bg-[#FFD60A] px-4 py-4 text-base font-extrabold text-[#0A0A0A] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "sending" ? "جارٍ الحفظ..." : "تغيير كلمة السر"}
      </button>
    </form>
  );
}
