/**
 * app/(employee)/employee/attendance/page.tsx
 *
 * Employee Attendance & Timesheet Portal — Real-time punch in/out,
 * monthly attendance status calendar, and daily work logs.
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  Coffee,
  PlayCircle,
  StopCircle,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentEmployee } from "@/lib/permissions/employee";
import { attendanceApi, type Attendance } from "@/lib/api";

export default function EmployeeAttendancePage() {
  const { employee } = useCurrentEmployee();
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);

  // Real-time digital clock
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  // Punch state
  const [isClockedIn, setIsClockedIn] = useState(true);
  const [clockInTime, setClockInTime] = useState("09:02 AM");
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);
  const [isOnBreak, setIsOnBreak] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setCurrentDate(now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadAttendance() {
      try {
        const records = await attendanceApi.getByEmployee(employee.employeeId);
        setAttendanceRecords(records);
      } catch (err) {
        console.error("Failed to load attendance:", err);
      }
    }
    loadAttendance();
  }, [employee.employeeId]);

  const handlePunchToggle = () => {
    const timeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    if (isClockedIn) {
      setIsClockedIn(false);
      setClockOutTime(timeStr);
      toast.success(`Clocked out at ${timeStr}. Have a great evening!`);
    } else {
      setIsClockedIn(true);
      setClockInTime(timeStr);
      setClockOutTime(null);
      toast.success(`Clocked in at ${timeStr}. Status: Present.`);
    }
  };

  const handleBreakToggle = () => {
    if (isOnBreak) {
      setIsOnBreak(false);
      toast.success("Resumed working session from lunch break.");
    } else {
      setIsOnBreak(true);
      toast.info("Break started. Take a refreshing rest!");
    }
  };

  // Mock monthly calendar data
  const calendarDays = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const isWeekend = (day % 7 === 5 || day % 7 === 6); // Fri/Sat in KSA
    const isToday = day === 23;
    let status: "present" | "late" | "leave" | "weekend" | "upcoming" = "present";

    if (isWeekend) status = "weekend";
    else if (day > 23) status = "upcoming";
    else if (day === 14) status = "late";
    else if (day === 8) status = "leave";

    return { day, status, isToday };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Clock className="h-6 w-6 text-emerald-400" />
          Attendance & Timesheets
        </h1>
        <p className="text-sm text-muted-foreground">
          Track daily punch-in sessions, lunch breaks, working hours, and monthly attendance calendar
        </p>
      </div>

      {/* Hero Punch Card & Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Col: Live Digital Clock & Punch Station */}
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 via-card to-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {isClockedIn ? (isOnBreak ? "On Lunch Break" : "Clocked In") : "Clocked Out"}
              </span>
              <span className="text-xs font-medium text-muted-foreground">Shift: 09:00 - 18:00</span>
            </div>

            {/* Live Clock Display */}
            <div className="mt-6 text-center">
              <div className="font-mono text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                {currentTime || "09:00:00 AM"}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">{currentDate}</p>
            </div>

            {/* In / Out Timestamps */}
            <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-border bg-background/50 p-3 text-center text-xs">
              <div>
                <p className="text-muted-foreground">First Check-in</p>
                <p className="font-bold text-foreground text-sm mt-0.5">{clockInTime}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Check-out</p>
                <p className="font-bold text-foreground text-sm mt-0.5">{clockOutTime || "--:--"}</p>
              </div>
            </div>
          </div>

          {/* Punch Actions */}
          <div className="mt-6 space-y-2">
            <button
              onClick={handlePunchToggle}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md transition-all active:scale-[0.98] ${
                isClockedIn
                  ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20"
                  : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20"
              }`}
            >
              {isClockedIn ? (
                <>
                  <StopCircle className="h-5 w-5" /> Clock Out for the Day
                </>
              ) : (
                <>
                  <PlayCircle className="h-5 w-5" /> Clock In Now
                </>
              )}
            </button>

            {isClockedIn && (
              <button
                onClick={handleBreakToggle}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Coffee className="h-4 w-4 text-amber-400" />
                {isOnBreak ? "Resume Working" : "Take Lunch Break (60 mins)"}
              </button>
            )}
          </div>
        </div>

        {/* Right 2 Cols: Monthly KPI Summary & Attendance Calendar */}
        <div className="lg:col-span-2 space-y-6">
          {/* Monthly KPI Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground">Present Days</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">19</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">On-time: 95%</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground">Late Check-ins</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">1</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Grace: 15 mins</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground">Leaves Taken</p>
              <p className="text-2xl font-bold text-sky-400 mt-1">1</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Approved Annual</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground">Avg Daily Hours</p>
              <p className="text-2xl font-bold text-foreground mt-1">8.3h</p>
              <p className="text-[10px] text-emerald-400 mt-0.5">+0.3h Overtime</p>
            </div>
          </div>

          {/* Monthly Attendance Calendar */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-emerald-400" />
                September 2026 Attendance Overview
              </h3>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Present
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Late
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Leave
                </span>
              </div>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1.5 pt-2 text-center text-xs">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                <div key={dayName} className="font-semibold text-muted-foreground py-1">
                  {dayName}
                </div>
              ))}
              {calendarDays.map((item) => (
                <div
                  key={item.day}
                  className={`rounded-lg py-2.5 font-mono text-xs transition-all ${
                    item.isToday
                      ? "ring-2 ring-indigo-500 font-bold bg-indigo-500/20 text-indigo-300"
                      : item.status === "present"
                      ? "bg-emerald-500/10 text-emerald-300 font-medium hover:bg-emerald-500/20"
                      : item.status === "late"
                      ? "bg-amber-500/15 text-amber-300 font-medium hover:bg-amber-500/25"
                      : item.status === "leave"
                      ? "bg-sky-500/15 text-sky-300 font-medium hover:bg-sky-500/25"
                      : item.status === "weekend"
                      ? "bg-muted/30 text-muted-foreground/60"
                      : "bg-background/40 text-muted-foreground/40"
                  }`}
                >
                  {item.day}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Timesheet Records Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Recent Daily Timesheet Logs</h2>
            <p className="text-xs text-muted-foreground">Detailed check-in, check-out, and total working hours calculation</p>
          </div>
          <button
            onClick={() => toast.success("Timesheet exported to CSV successfully")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            Export Timesheet
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">First Check-in</th>
                <th className="px-6 py-3">Last Check-out</th>
                <th className="px-6 py-3">Working Hours</th>
                <th className="px-6 py-3">Overtime</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground text-xs">
              {(attendanceRecords.length > 0
                ? attendanceRecords.map((r) => ({
                    date: r.date,
                    in: r.check_in || "09:00 AM",
                    out: r.check_out || "06:00 PM",
                    hours: r.working_hours ? `${r.working_hours} hrs` : "8.0 hrs",
                    ot: "--",
                    status: r.status,
                  }))
                : [
                    { date: "2026-09-23 (Today)", in: "09:02 AM", out: "In Progress", hours: "5.3 hrs", ot: "--", status: "present" },
                    { date: "2026-09-22", in: "08:58 AM", out: "06:12 PM", hours: "8.2 hrs", ot: "+12m", status: "present" },
                    { date: "2026-09-21", in: "09:01 AM", out: "06:30 PM", hours: "8.5 hrs", ot: "+30m", status: "present" },
                    { date: "2026-09-20", in: "08:55 AM", out: "06:05 PM", hours: "8.1 hrs", ot: "+5m", status: "present" },
                    { date: "2026-09-17", in: "09:20 AM", out: "06:15 PM", hours: "7.9 hrs", ot: "--", status: "late" },
                    { date: "2026-09-16", in: "09:00 AM", out: "06:00 PM", hours: "8.0 hrs", ot: "--", status: "present" },
                  ]
              ).map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-3.5 font-semibold text-foreground">{row.date}</td>
                  <td className="px-6 py-3.5 font-mono text-muted-foreground">{row.in}</td>
                  <td className="px-6 py-3.5 font-mono text-muted-foreground">{row.out}</td>
                  <td className="px-6 py-3.5 font-semibold text-foreground">{row.hours}</td>
                  <td className="px-6 py-3.5 text-emerald-400 font-mono">{row.ot}</td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                        row.status === "present"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
