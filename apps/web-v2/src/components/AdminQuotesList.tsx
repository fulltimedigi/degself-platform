"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { statusMeta, urgencyClass } from "@/lib/quotes";

export interface QuoteRow {
  id: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  service: string;
  car: string;
  area: string;
  urgency: string;
  created_label: string;
}

function StatusBadge({ status }: { status: string }) {
  const m = statusMeta(status);
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${m.className}`}>
      {m.label}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${urgencyClass(urgency)}`}>
      {urgency}
    </span>
  );
}

export function AdminQuotesList({ rows }: { rows: QuoteRow[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.customer_name, r.customer_phone, r.service]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [rows, q]);

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ابحث بالاسم أو الرقم أو الخدمة…"
        className="mb-4 w-full rounded-lg border border-border bg-card px-3 py-3 text-base focus:border-[#FFD60A] focus:outline-none"
      />

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          لا توجد طلبات مطابقة.
        </p>
      ) : (
        <>
          {/* Mobile: card list */}
          <ul className="flex flex-col gap-3 sm:hidden">
            {filtered.map((r) => (
              <li key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <StatusBadge status={r.status} />
                  <span className="text-xs text-muted-foreground">{r.created_label}</span>
                </div>
                <p className="font-bold">{r.customer_name}</p>
                <a
                  href={`tel:${r.customer_phone}`}
                  dir="ltr"
                  className="inline-block font-mono text-sm text-[#FFD60A]"
                >
                  {r.customer_phone}
                </a>
                <p className="mt-1 text-sm">{r.service}</p>
                {r.car && <p className="text-sm text-muted-foreground">{r.car}</p>}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <UrgencyBadge urgency={r.urgency} />
                    {r.area && <span>{r.area}</span>}
                  </div>
                  <Link
                    href={`/admin/quotes/${r.id}`}
                    className="rounded-lg bg-[#FFD60A] px-3 py-1.5 text-xs font-extrabold text-[#0A0A0A]"
                  >
                    تفاصيل
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
            <table className="w-full text-right text-sm">
              <thead className="bg-card text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-bold">الحالة</th>
                  <th className="px-3 py-2 font-bold">الاسم</th>
                  <th className="px-3 py-2 font-bold">الرقم</th>
                  <th className="px-3 py-2 font-bold">الخدمة</th>
                  <th className="px-3 py-2 font-bold">السيارة</th>
                  <th className="px-3 py-2 font-bold">المحافظة</th>
                  <th className="px-3 py-2 font-bold">الإلحاح</th>
                  <th className="px-3 py-2 font-bold">التاريخ</th>
                  <th className="px-3 py-2 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-2 font-bold">{r.customer_name}</td>
                    <td className="px-3 py-2">
                      <a href={`tel:${r.customer_phone}`} dir="ltr" className="font-mono text-[#FFD60A]">
                        {r.customer_phone}
                      </a>
                    </td>
                    <td className="px-3 py-2">{r.service}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.car || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.area || "—"}</td>
                    <td className="px-3 py-2">
                      <UrgencyBadge urgency={r.urgency} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {r.created_label}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/quotes/${r.id}`}
                        className="rounded-lg bg-[#FFD60A] px-3 py-1.5 text-xs font-extrabold text-[#0A0A0A]"
                      >
                        تفاصيل
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
