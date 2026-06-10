"use client";

import { useEffect, useState } from "react";
import {
  parseOpeningHoursString,
  todayName,
  formatHours,
  DAY_ORDER,
  DAY_AR,
} from "@/lib/hours";

/** 7-day opening-hours table (Kuwait week, today highlighted client-side). */
export function HoursTable({ openingHours }: { openingHours: string | null }) {
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
              {DAY_AR[day]}
              {isToday ? " (اليوم)" : ""}
            </span>
            <span dir="ltr">{hours ? formatHours(hours) : "—"}</span>
          </li>
        );
      })}
    </ul>
  );
}
