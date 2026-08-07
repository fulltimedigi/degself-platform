"use client";

import { useState } from "react";

type ImportResult = {
  workshop?: { place_id?: string; name?: string };
  existing?: boolean;
  error?: string;
};

export function PartnerLinkImporter({
  onAdded,
}: {
  onAdded: (placeId: string) => void | Promise<void>;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = url.trim();
    if (!value || busy) return;

    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const data = (await res.json().catch(() => ({}))) as ImportResult;
      if (!res.ok) {
        setMessage({ kind: "err", text: data.error ?? "تعذّر إضافة الكراج من الرابط." });
        return;
      }

      const placeId = data.workshop?.place_id;
      if (placeId) await onAdded(placeId);
      const name = data.workshop?.name || "الكراج";
      setMessage({
        kind: "ok",
        text: data.existing ? `${name} موجود بالفعل في شبكة الشركاء ✓` : `تمت إضافة ${name} للشبكة ✓`,
      });
      setUrl("");
    } catch {
      setMessage({ kind: "err", text: "تعذّر الاتصال." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-[#FFD60A]/40 bg-[#FFD60A]/5 p-4">
      <div className="mb-3">
        <h3 className="font-extrabold">إضافة سريعة بالرابط</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          افتح صفحة الكراج في دق سلف، انسخ الرابط، والصقه هنا. لو الكراج موجود في الدليل الأساسي
          سيتضاف للشبكة مباشرة بدون إعادة إدخال بياناته.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          inputMode="url"
          dir="ltr"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://degself.com/ar/workshop/ChIJ..."
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-[#FFD60A] focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="rounded-lg bg-[#FFD60A] px-4 py-2.5 text-sm font-extrabold text-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "جارٍ الإضافة…" : "أضف للشركاء"}
        </button>
      </div>
      {message && (
        <p
          className={`mt-3 text-sm ${
            message.kind === "ok" ? "text-green-400" : "text-red-400"
          }`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
