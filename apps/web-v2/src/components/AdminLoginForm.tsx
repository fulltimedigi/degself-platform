"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Only honour internal paths for the post-login redirect (block open-redirects).
  const nextRaw = params.get("next") ?? "";
  const next = nextRaw.startsWith("/admin") ? nextRaw : "/admin/quotes";

  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "تعذر الدخول، حاول مرة أخرى.");
        return;
      }
      // Full navigation so the new cookie is sent with the next request and
      // middleware lets us through.
      router.replace(next);
      router.refresh();
    } catch {
      setStatus("error");
      setError("تعذر الاتصال، تأكد من الإنترنت.");
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-bold">كلمة السر</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoFocus
          className="w-full rounded-lg border border-border bg-card px-3 py-3 text-base focus:border-[#FFD60A] focus:outline-none"
        />
      </div>

      {status === "error" && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-lg bg-[#FFD60A] px-4 py-4 text-base font-extrabold text-[#0A0A0A] transition hover:brightness-95 disabled:opacity-60"
      >
        {status === "sending" ? "جارٍ الدخول..." : "دخول"}
      </button>
    </form>
  );
}
