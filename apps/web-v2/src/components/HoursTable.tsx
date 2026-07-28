"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  parseOpeningHoursString,
  todayName,
  formatHours,
  DAY_ORDER,
} from "@/lib/hours";

// formatHours returns Arabic special-cases ("مغلق" / "مفتوح ٢٤ ساعة") or a
// numeric time range; translate the two special-cases, keep numeric ranges as-is.
function localizeHours(hours: string, t: (k: string) => string): string {
  const formatted = formatHours(hours);
  if (formatted === "مغلق") return t("closed");
  if (formatted.includes("٢٤") || formatted.includes("24")) return t("open24");
  return formatted;
}

/** 7-day opening-hours table (Kuwait week, today highlighted client-side). */
export function HoursTable({ openingHours }: { openingHours: string | null }) {
  const t = useTranslations("workshop");
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(todayName()), []);

  const rows = parseOpeningHoursString(openingHours);
  if (!rows.length) return null;
  const byDay = new Map(rows.map((r) => [r.day, r.hours]));

  return (
    <ul className="flex flex-col divide-y divide-border">
      {DAY_ORDER.map((day) => {
        const isToday = day === today;
        const hours = byDay.get(day);
        return (
          <li
            key={day}
            className={
              "flex items-center justify-between py-2 text-sm " +
              (isToday ? "font-bold text-primary" : "text-muted-foreground")
            }
          >
            <span>
              {t(`days.${day}`)}
              {isToday ? ` ${t("today")}` : ""}
            </span>
            <span dir="ltr">{hours ? localizeHours(hours, t) : "—"}</span>
          </li>
        );
      })}
    </ul>
  );
}
