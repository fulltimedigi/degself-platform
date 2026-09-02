"use client";

import { useEffect, useMemo, useState } from "react";
import { outreachWaLink, type PortalExportRow } from "@/lib/garage-portal";

// Per-garage one-tap WhatsApp outreach. No automated sending — each row opens
// wa.me with the message pre-filled; the human reviews and hits send. Progress
// (who's been contacted) is tracked locally in this browser only.

const SENT_KEY = "degself:outreach:sent:v1";

function loadSent(): Set<string> {
  try {
    const raw = localStorage.getItem(SENT_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.filter((x) => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function saveSent(sent: Set<string>) {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify([...sent]));
  } catch {
    /* private mode / blocked storage — progress just won't persist */
  }
}

export function AdminOutreachClient({ rows }: { rows: PortalExportRow[] }) {
  const [sent, setSent] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [hideSent, setHideSent] = useState(false);

  useEffect(() => {
    setSent(loadSent());
    setHydrated(true);
  }, []);

  const markSent = (key: string, value: boolean) => {
    setSent((prev) => {
      const next = new Set(prev);
      if (value) next.add(key);
      else next.delete(key);
      saveSent(next);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (hideSent && sent.has(r.portalUrl)) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.area.toLowerCase().includes(q) ||
        r.whatsapp.includes(q)
      );
    });
  }, [rows, query, hideSent, sent]);

  const sentCount = useMemo(
    () => rows.reduce((n, r) => n + (sent.has(r.portalUrl) ? 1 : 0), 0),
    [rows, sent]
  );

  const pct = rows.length ? Math.round((sentCount / rows.length) * 100) : 0;

  return (
    <div>
      {/* Progress */}
      <div className="mb-4 rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between text-sm font-bold">
          <span>تم التواصل معهم</span>
          <span className="text-[#FFD60A]">
            {hydrated ? `${sentCount} / ${rows.length}` : `— / ${rows.length}`}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full bg-[#FFD60A] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="min-w-[200px] flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-base focus:border-[#FFD60A] focus:outline-none"
          placeholder="ابحث بالاسم أو المنطقة أو الرقم"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={hideSent}
            onChange={(e) => setHideSent(e.target.checked)}
            className="h-4 w-4 accent-[#FFD60A]"
          />
          إخفاء اللي تم إرساله
        </label>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        عدد الظاهر: {filtered.length} كراج
      </p>

      {/* List */}
      <ul className="flex flex-col gap-2">
        {filtered.map((r) => {
          const isSent = sent.has(r.portalUrl);
          return (
            <li
              key={r.portalUrl}
              className={`rounded-xl border p-4 transition ${
                isSent ? "border-border bg-card/40 opacity-70" : "border-border bg-card"
              }`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-extrabold">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.area || "—"} · <span dir="ltr">{r.whatsapp}</span>
                    {r.isPartner && (
                      <span className="ms-2 rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-bold text-green-400">
                        مفعّل
                      </span>
                    )}
                  </p>
                </div>
                {isSent && (
                  <span className="rounded-full bg-[#FFD60A]/15 px-2 py-0.5 text-[11px] font-bold text-[#FFD60A]">
                    تم الإرسال
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={outreachWaLink(r.name, r.whatsapp, r.portalUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => markSent(r.portalUrl, true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-extrabold text-white transition hover:brightness-95"
                >
                  💬 افتح واتساب برسالة جاهزة
                </a>
                <button
                  type="button"
                  onClick={() => markSent(r.portalUrl, !isSent)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-bold transition ${
                    isSent
                      ? "border-border text-muted-foreground hover:border-[#FFD60A]"
                      : "border-[#FFD60A] text-[#FFD60A] hover:bg-[#FFD60A]/10"
                  }`}
                >
                  {isSent ? "إلغاء التعليم" : "علّم كـ«تم»"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">لا يوجد كراجات مطابقة.</p>
      )}
    </div>
  );
}
