/**
 * CheckInOut — real-time check-in / check-out widget.
 * Shows current status, elapsed time, and history for today.
 */

"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface AttendanceRecord {
  type: "in" | "out";
  time: string; // ISO string
}

interface CheckInOutProps {
  employeeName?: string;
  /** Initial records for today */
  records?: AttendanceRecord[];
  onCheckIn?: (time: Date) => void;
  onCheckOut?: (time: Date) => void;
  className?: string;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CheckInOut({
  employeeName = "Employee",
  records: initialRecords = [],
  onCheckIn,
  onCheckOut,
  className,
}: CheckInOutProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
  const [now, setNow] = useState(new Date());
  const [elapsed, setElapsed] = useState(0);

  const lastRecord = records[records.length - 1];
  const isCheckedIn = lastRecord?.type === "in";

  /* Live clock */
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  /* Elapsed timer */
  useEffect(() => {
    if (!isCheckedIn) { setElapsed(0); return; }
    const checkInTime = new Date(lastRecord.time);
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - checkInTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [isCheckedIn, lastRecord]);

  const handleCheck = () => {
    const time = new Date();
    const type: "in" | "out" = isCheckedIn ? "out" : "in";
    const record: AttendanceRecord = { type, time: time.toISOString() };
    setRecords((r) => [...r, record]);
    if (type === "in") onCheckIn?.(time);
    else onCheckOut?.(time);
  };

  const todayDate = now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div className={cn("rounded-2xl border border-border bg-card shadow-card overflow-hidden", className)}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-6 py-4",
        isCheckedIn ? "bg-emerald-500/10" : "bg-muted/40",
      )}>
        <div>
          <p className="text-sm font-semibold text-foreground">{employeeName}</p>
          <p className="text-xs text-muted-foreground">{todayDate}</p>
        </div>
        <div className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
          isCheckedIn
            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
            : "bg-muted text-muted-foreground",
        )}>
          <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", isCheckedIn ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
          {isCheckedIn ? "Checked In" : "Checked Out"}
        </div>
      </div>

      {/* Live clock + elapsed */}
      <div className="flex flex-col items-center gap-2 px-6 py-8">
        <p
          className="font-mono text-5xl font-bold tracking-tight text-foreground tabular-nums"
          aria-live="polite"
          aria-label={`Current time: ${formatTime(now)}`}
        >
          {formatTime(now)}
        </p>
        {isCheckedIn && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            Elapsed: {formatDuration(elapsed)}
          </p>
        )}
      </div>

      {/* Check in/out button */}
      <div className="px-6 pb-6">
        <button
          type="button"
          id="check-in-out-btn"
          onClick={handleCheck}
          aria-label={isCheckedIn ? "Check out" : "Check in"}
          className={cn(
            "w-full rounded-xl py-3.5 text-base font-semibold transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isCheckedIn
              ? "bg-danger text-white hover:opacity-90 shadow-sm"
              : "bg-primary text-primary-foreground hover:opacity-90 shadow-glow-teal",
          )}
        >
          {isCheckedIn ? "Check Out" : "Check In"}
        </button>
      </div>

      {/* Today's history */}
      {records.length > 0 && (
        <div className="border-t border-border px-6 py-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Today&apos;s Log
          </h4>
          <ol className="space-y-2" aria-label="Check-in/out history">
            {records.map((r, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className={cn(
                  "inline-flex items-center gap-1.5 font-medium",
                  r.type === "in" ? "text-emerald-600 dark:text-emerald-400" : "text-danger",
                )}>
                  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                    {r.type === "in" ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    )}
                  </svg>
                  {r.type === "in" ? "Check In" : "Check Out"}
                </span>
                <time dateTime={r.time} className="text-muted-foreground">
                  {new Date(r.time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </time>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
