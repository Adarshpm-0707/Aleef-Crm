/**
 * Calendar — monthly attendance calendar.
 * Shows check-in/out status per day with colour coding.
 * Responsive: compact cells on mobile.
 */

"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

/* ─── Types ────────────────────────────────────────────────────────────────── */

export type DayStatus = "present" | "absent" | "leave" | "holiday" | "half-day";

export interface AttendanceDay {
  date: string; // YYYY-MM-DD
  status: DayStatus;
  checkIn?: string;
  checkOut?: string;
  note?: string;
}

export interface AttendanceCalendarProps {
  year?: number;
  month?: number; // 1-based
  days?: AttendanceDay[];
  onDayClick?: (day: AttendanceDay | null, date: string) => void;
  className?: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

const STATUS_STYLES: Record<DayStatus, string> = {
  present:  "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  absent:   "bg-rose-500/20 text-rose-700 dark:text-rose-400",
  leave:    "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  holiday:  "bg-sky-500/20 text-sky-700 dark:text-sky-400",
  "half-day": "bg-purple-500/20 text-purple-700 dark:text-purple-400",
};

const STATUS_DOT: Record<DayStatus, string> = {
  present:  "bg-emerald-500",
  absent:   "bg-rose-500",
  leave:    "bg-amber-500",
  holiday:  "bg-sky-500",
  "half-day": "bg-purple-500",
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

/* ─── Component ────────────────────────────────────────────────────────────── */

export function AttendanceCalendar({
  year: initialYear,
  month: initialMonth,
  days = [],
  onDayClick,
  className,
}: AttendanceCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(initialYear ?? today.getFullYear());
  const [month, setMonth] = useState(initialMonth ?? today.getMonth() + 1);
  const [tooltip, setTooltip] = useState<string | null>(null);

  /* grid computation */
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = firstDay + daysInMonth; // leading blanks + days
  const totalRows = Math.ceil(cells / 7);

  const dayMap = new Map<string, AttendanceDay>(days.map((d) => [d.date, d]));

  const nav = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m);
    setYear(y);
  };

  const todayStr = today.toISOString().slice(0, 10);

  /* summary counts */
  const summary = days.reduce<Record<DayStatus, number>>(
    (acc, d) => { acc[d.status] = (acc[d.status] ?? 0) + 1; return acc; },
    {} as Record<DayStatus, number>,
  );

  return (
    <div className={cn("rounded-2xl border border-border bg-card shadow-card overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <button
          type="button"
          onClick={() => nav(-1)}
          aria-label="Previous month"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
        </button>

        <h3 className="text-base font-semibold text-foreground" aria-live="polite">
          {MONTHS[month - 1]} {year}
        </h3>

        <button
          type="button"
          onClick={() => nav(1)}
          aria-label="Next month"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d[0]}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7" role="grid" aria-label={`${MONTHS[month - 1]} ${year} attendance`}>
        {Array.from({ length: totalRows * 7 }, (_, i) => {
          const dayNum = i - firstDay + 1;
          if (dayNum < 1 || dayNum > daysInMonth) {
            return <div key={i} aria-hidden="true" className="border-b border-r border-border/50 p-1 sm:p-2 min-h-[2.5rem]" />;
          }
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const att = dayMap.get(dateStr);
          const isToday = dateStr === todayStr;
          const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;

          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              aria-label={`${dateStr}${att ? `, ${att.status}` : ""}`}
              aria-current={isToday ? "date" : undefined}
              onClick={() => onDayClick?.(att ?? null, dateStr)}
              onMouseEnter={() => att ? setTooltip(dateStr) : null}
              onMouseLeave={() => setTooltip(null)}
              className={cn(
                "relative flex min-h-[2.5rem] flex-col items-center justify-start border-b border-r border-border/50 p-1 transition-colors sm:p-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                isWeekend && "bg-muted/20",
                att && "hover:bg-muted/40",
                !att && "hover:bg-muted/20",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-foreground",
                )}
              >
                {dayNum}
              </span>

              {att && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2",
                    STATUS_DOT[att.status],
                  )}
                />
              )}

              {/* Tooltip */}
              {tooltip === dateStr && att && (
                <div
                  role="tooltip"
                  className="absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-lg"
                >
                  <p className="font-semibold capitalize">{att.status}</p>
                  {att.checkIn && <p>In: {att.checkIn}</p>}
                  {att.checkOut && <p>Out: {att.checkOut}</p>}
                  {att.note && <p className="text-muted-foreground">{att.note}</p>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend + summary */}
      <div className="border-t border-border px-5 py-4">
        <div className="flex flex-wrap gap-3">
          {(Object.entries(STATUS_STYLES) as [DayStatus, string][]).map(([status, cls]) => (
            <span key={status} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", cls)}>
              <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", STATUS_DOT[status])} />
              {status.replace("-", " ")} {summary[status] ? `(${summary[status]})` : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
