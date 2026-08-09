"use client";

import { useState } from "react";

type ImportResult = {
  workshop?: { place_id?: string; name?: string };
  existing?: boolean;
  matchedByPhone?: boolean;
  manual?: boolean;
  error?: string;
};

type Mode = "link" | "manual";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-[#FFD60A] focus:outline-none";

export function PartnerLinkImporter({
  onAdded,
}: {
  onAdded?: (placeId: string) => void | Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>("link");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [area, setArea] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function finish(data: ImportResult) {
    const placeId = data.workshop?.place_id;
    if (placeId && onAdded) await onAdded(placeId);
    const workshopName = data.workshop?.name || "الكراج";
    const text = data.matchedByPhone
      ? `${workshopName} كان موجوداً برقم الهاتف وتمت إضافته للشبكة ✓`
      : data.existing
        ? `${workshopName} موجود بالفعل في شبكة الشركاء ✓`
        : `تمت إضافة ${workshopName} للشبكة ✓`;
    setMessage({ kind: "ok", text });

    if (mode === "link") setUrl("");
    else {
      setName("");
      setPhone("");
      setSpecialty("");
      setArea("");
      setNotes("");
    }

    if (placeId && !onAdded) window.location.reload();
  }

  async function submitLink(e: React.FormEvent) {
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
      await finish(data);
    } catch {
      setMessage({ kind: "err", text: "تعذّر الاتصال." });
    } finally {
      setBusy(false);
    }
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !specialty.trim() || busy) return;

    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "manual",
          name: name.trim(),
          phone: phone.trim(),
          reviewed_specialty: specialty.trim(),
          area: area.trim(),
          partner_notes: notes.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as ImportResult;
      if (!res.ok) {
        setMessage({ kind: "err", text: data.error ?? "تعذّر إضافة الكراج يدوياً." });
        return;
      }
      await finish(data);
    } catch {
      setMessage({ kind: "err", text: "تعذّر الاتصال." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#FFD60A]/40 bg-[#FFD60A]/5 p-4">
      <div className="mb-4 flex gap-2 rounded-lg border border-border bg-background/60 p-1">
        <button
          type="button"
          onClick={() => { setMode("link"); setMessage(null); }}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-extrabold ${
            mode === "link" ? "bg-[#FFD60A] text-[#0A0A0A]" : "text-muted-foreground"
          }`}
        >
          موجود في دق سلف — بالرابط
        </button>
        <button
          type="button"
          onClick={() => { setMode("manual"); setMessage(null); }}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-extrabold ${
            mode === "manual" ? "bg-[#FFD60A] text-[#0A0A0A]" : "text-muted-foreground"
          }`}
        >
          كراج جديد — إضافة يدوية
        </button>
      </div>

      {mode === "link" ? (
        <form onSubmit={submitLink}>
          <div className="mb-3">
            <h3 className="font-extrabold">إضافة سريعة بالرابط</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              للكراج الموجود بالفعل في دليل دق سلف: افتح صفحته، انسخ الرابط والصقه هنا. لن نكرر بياناته.
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
        </form>
      ) : (
        <form onSubmit={submitManual}>
          <div className="mb-3">
            <h3 className="font-extrabold">إضافة كراج جديد يدوياً</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              استخدمها فقط لو الكراج غير موجود في دليل دق سلف. ندخل أقل بيانات لازمة للشبكة، وRFQ يظل مقفولاً حتى تسجل الموافقة وتتحقق من الرقم.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold">
              اسم الكراج *
              <input className={`mt-1 ${inputCls}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </label>
            <label className="text-sm font-bold">
              رقم واتساب *
              <input
                className={`mt-1 ${inputCls}`}
                dir="ltr"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="50000000 أو +96550000000"
                maxLength={30}
              />
            </label>
            <label className="text-sm font-bold">
              التخصص الأساسي *
              <input
                className={`mt-1 ${inputCls}`}
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="مثال: تكييف وفريون"
                maxLength={120}
              />
            </label>
            <label className="text-sm font-bold">
              المنطقة — اختياري
              <input className={`mt-1 ${inputCls}`} value={area} onChange={(e) => setArea(e.target.value)} maxLength={120} />
            </label>
          </div>

          <label className="mt-3 block text-sm font-bold">
            ملاحظات داخلية — اختياري
            <input className={`mt-1 ${inputCls}`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </label>

          <button
            type="submit"
            disabled={busy || !name.trim() || !phone.trim() || !specialty.trim()}
            className="mt-4 w-full rounded-lg bg-[#FFD60A] px-4 py-2.5 text-sm font-extrabold text-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "جارٍ الإضافة…" : "إنشاء الكراج وإضافته للشبكة"}
          </button>
        </form>
      )}

      {message && (
        <p className={`mt-3 text-sm ${message.kind === "ok" ? "text-green-400" : "text-red-400"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
