"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, Check, X } from "lucide-react";
import { formatArabicDate } from "@/lib/utils";

type Status = "pending" | "approved" | "rejected";

interface ModReview {
  id: string;
  place_id: string;
  rating: number;
  author_name: string | null;
  body: string;
  status: Status;
  created_at: string;
  garage_name: string | null;
}

// Relies on the httpOnly admin_session cookie from /admin/login (middleware
// already gates this page). No password in sessionStorage / Bearer headers.
export function ModerationPanel() {
  const [tab, setTab] = useState<Status>("pending");
  const [reviews, setReviews] = useState<ModReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (status: Status) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/reviews/moderate?status=${status}`, {
        credentials: "same-origin",
      });
      if (res.status === 401) {
        setError("انتهت الجلسة. أعد تسجيل الدخول من /admin/login.");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "تعذّر التحميل.");
        return;
      }
      setReviews(data.reviews ?? []);
    } catch {
      setError("تعذّر الاتصال.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  async function act(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      const res = await fetch("/api/reviews/moderate", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.status === 401) {
        setError("انتهت الجلسة. أعد تسجيل الدخول من /admin/login.");
        return;
      }
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== id));
      } else {
        const data = await res.json();
        setError(data.error ?? "تعذّر التحديث.");
      }
    } catch {
      setError("تعذّر الاتصال.");
    } finally {
      setBusyId(null);
    }
  }

  const TABS: { key: Status; label: string }[] = [
    { key: "pending", label: "قيد المراجعة" },
    { key: "approved", label: "منشورة" },
    { key: "rejected", label: "مرفوضة" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="py-12 text-center text-muted-foreground">جارٍ التحميل…</p>
      ) : reviews.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">لا توجد تقييمات في هذه القائمة.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-bold">{r.garage_name ?? r.place_id}</span>
                <span className="flex items-center gap-0.5" dir="ltr">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      size={15}
                      className={n <= r.rating ? "text-yellow-400" : "text-muted-foreground/30"}
                      fill={n <= r.rating ? "currentColor" : "none"}
                    />
                  ))}
                </span>
              </div>
              <p className="mb-2 whitespace-pre-wrap text-sm text-foreground">{r.body}</p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {r.author_name ? `${r.author_name} · ` : ""}
                  {formatArabicDate(r.created_at.slice(0, 10))}
                </span>
                {tab === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => act(r.id, "approve")}
                      disabled={busyId === r.id}
                      className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                    >
                      <Check size={14} /> موافقة
                    </button>
                    <button
                      onClick={() => act(r.id, "reject")}
                      disabled={busyId === r.id}
                      className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-muted disabled:opacity-50"
                    >
                      <X size={14} /> رفض
                    </button>
                  </div>
                )}
                {tab === "rejected" && (
                  <button
                    onClick={() => act(r.id, "approve")}
                    disabled={busyId === r.id}
                    className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                  >
                    <Check size={14} /> نشر
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
