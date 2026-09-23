/**
 * app/(admin)/admin/attendance/calendar/page.tsx
 *
 * Monthly Workforce Attendance Calendar:
 * - Powered by AttendanceCalendar component
 * - Filter by individual employee or view organization aggregates
 * - Month and Year navigation controls
 * - Day inspector modal displaying check-in, check-out, and status
 */

"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  attendanceApi,
  employeesApi,
  type Employee,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { AttendanceCalendar, type AttendanceDay, type DayStatus } from "@/components/attendance/Calendar";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function AttendanceCalendarPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<string>("");
  const [year, setYear] = useState<number>(2026);
  const [month, setMonth] = useState<number>(9);
  const [calendarDays, setCalendarDays] = useState<AttendanceDay[]>([]);
  const [loading, setLoading] = useState(true);

  // Inspector modal
  const [inspectDay, setInspectDay] = useState<{ day: AttendanceDay | null; date: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eList, days] = await Promise.all([
        employeesApi.getAll(),
        attendanceApi.getCalendar(year, month, selectedEmp || undefined),
      ]);
      setEmployees(eList);

      // Map to AttendanceDay format
      const mapped: AttendanceDay[] = days.map((d) => {
        let st: DayStatus = "present";
        if (d.status === "absent") st = "absent";
        else if (d.status === "leave") st = "leave";
        else if (d.status === "half_day") st = "half-day";

        return {
          date: d.date,
          status: st,
          checkIn: d.checkIn,
          checkOut: d.checkOut,
          note: d.status === "late" ? "Arrived after 08:30" : undefined,
        };
      });

      setCalendarDays(mapped);
    } catch {
      toast.error("Failed to load attendance calendar");
    } finally {
      setLoading(false);
    }
  }, [year, month, selectedEmp]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Escape key to close inspector modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && inspectDay) {
        setInspectDay(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inspectDay]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Calendar"
        description="Month-at-a-glance workforce presence, tardiness logs, and scheduled leaves."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Attendance", href: "/admin/attendance/today" },
          { label: "Monthly Calendar" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/attendance/today"
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Today&apos;s Roster
            </Link>
          </div>
        }
      />

      {/* Filter and Selection Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <label htmlFor="cal-emp-select" className="text-xs font-medium text-muted-foreground">Employee:</label>
            <select
              id="cal-emp-select"
              value={selectedEmp}
              onChange={(e) => setSelectedEmp(e.target.value)}
              className="min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Organization Overview (All Staff)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.user?.full_name} ({emp.employee_id})
                </option>
              ))}
            </select>
          </div>

          {/* Month/Year selector buttons */}
          <div className="flex items-center gap-1.5 sm:border-l sm:border-border sm:pl-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded-lg border border-border p-2 sm:p-1.5 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Previous Month"
              aria-label="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[120px] text-center text-sm font-semibold text-foreground">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded-lg border border-border p-2 sm:p-1.5 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Next Month"
              aria-label="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" /> Present
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden="true" /> Late / Half Day
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" aria-hidden="true" /> Approved Leave
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" aria-hidden="true" /> Absent
          </span>
        </div>
      </div>

      {/* Main Calendar View */}
      <div className="relative rounded-2xl border border-border bg-card p-6 shadow-sm overflow-x-auto">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/50 backdrop-blur-[1px]" role="status" aria-busy="true">
            <span className="sr-only">Loading calendar days...</span>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          </div>
        )}
        <AttendanceCalendar
          year={year}
          month={month}
          days={calendarDays}
          onDayClick={(day, date) => setInspectDay({ day, date })}
        />
      </div>

      {/* Day Inspector Modal */}
      {inspectDay && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="day-inspector-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
        >
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in">
            <h3 id="day-inspector-title" className="text-base font-semibold text-foreground">
              Date Record: {inspectDay.date}
            </h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-semibold capitalize text-teal-600">
                  {inspectDay.day?.status || "Normal Working Day"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-in</span>
                <span className="font-mono text-foreground">{inspectDay.day?.checkIn || "08:15"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-out</span>
                <span className="font-mono text-foreground">{inspectDay.day?.checkOut || "17:30"}</span>
              </div>
              {inspectDay.day?.note && (
                <div className="rounded bg-muted/40 p-2 text-xs text-muted-foreground">
                  {inspectDay.day.note}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectDay(null)}
                className="min-h-[44px] sm:min-h-0 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
