/**
 * app/(admin)/admin/attendance/today/page.tsx
 *
 * Real-time Daily Attendance Roster:
 * - Live KPI metrics: Present, Late, Half Day, Absent, On Leave
 * - Roster table with check-in, check-out, working hours, status
 * - Admin manual override modal to record or adjust attendance
 * - Export today's attendance sheet
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  attendanceApi,
  type Attendance,
  type AttendanceStatus,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type ColumnDef } from "@/components/shared/DataTable";
import { ExportButton } from "@/components/shared/ExportButton";
import {
  Edit2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; style: string }> = {
  present: { label: "Present", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  late: { label: "Late Arrival", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  half_day: { label: "Half Day", style: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  absent: { label: "Absent", style: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  wfh: { label: "Work From Home", style: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20" },
  leave: { label: "On Approved Leave", style: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
};

export default function TodayAttendancePage() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  // Override modal
  const [overrideRecord, setOverrideRecord] = useState<Attendance | null>(null);

  const loadData = useCallback(async () => {
    try {
      const att = await attendanceApi.getToday();
      setAttendance(att);
    } catch {
      toast.error("Failed to load today's attendance roster");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && overrideRecord) {
        setOverrideRecord(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [overrideRecord]);

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideRecord) return;

    try {
      await attendanceApi.mark({
        employeeId: overrideRecord.employee_id,
        date: overrideRecord.date,
        status: overrideRecord.status,
        checkIn: overrideRecord.check_in,
        checkOut: overrideRecord.check_out,
        workingHours: overrideRecord.working_hours,
      });
      toast.success(`Attendance updated for ${overrideRecord.employee?.user?.full_name}`);
      setOverrideRecord(null);
      loadData();
    } catch {
      toast.error("Failed to update attendance record");
    }
  };

  // KPIs
  const presentCount = attendance.filter((a) => a.status === "present" || a.status === "wfh").length;
  const lateCount = attendance.filter((a) => a.status === "late").length;
  const leaveCount = attendance.filter((a) => a.status === "leave").length;
  const absentCount = attendance.filter((a) => a.status === "absent").length;

  const exportColumns = [
    { key: "employee_id", header: "Employee Code" },
    { key: "full_name", header: "Employee Name" },
    { key: "department", header: "Department" },
    { key: "check_in", header: "Check In" },
    { key: "check_out", header: "Check Out" },
    { key: "working_hours", header: "Working Hours" },
    { key: "status", header: "Status" },
  ];

  const exportData = useMemo(() => {
    return attendance.map((a) => ({
      employee_id: a.employee?.employee_id || "",
      full_name: a.employee?.user?.full_name || "",
      department: a.employee?.department?.name || "",
      check_in: a.check_in ? a.check_in.slice(11, 16) : "-",
      check_out: a.check_out ? a.check_out.slice(11, 16) : "-",
      working_hours: a.working_hours || 0,
      status: a.status,
    }));
  }, [attendance]);

  const columns: ColumnDef<Attendance>[] = [
    {
      key: "employee",
      header: "Employee / Designation",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500/15 text-teal-600 font-bold text-xs">
            {row.employee?.user?.full_name
              ? row.employee.user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
              : "EM"}
          </div>
          <div>
            <p className="font-semibold text-foreground">{row.employee?.user?.full_name}</p>
            <p className="text-xs text-muted-foreground">{row.employee?.designation} &bull; {row.employee?.department?.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: "check_in",
      header: "Check-in",
      sortable: true,
      cell: (row) => (
        <span className="text-xs font-mono font-medium text-foreground">
          {row.check_in ? row.check_in.slice(11, 16) : "--:--"}
        </span>
      ),
    },
    {
      key: "check_out",
      header: "Check-out",
      sortable: true,
      cell: (row) => (
        <span className="text-xs font-mono text-muted-foreground">
          {row.check_out ? row.check_out.slice(11, 16) : "--:--"}
        </span>
      ),
    },
    {
      key: "working_hours",
      header: "Hours Logged",
      sortable: true,
      cell: (row) => (
        <span className="text-xs font-medium text-foreground">
          {row.working_hours ? `${row.working_hours} hrs` : "0 hrs"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Attendance Status",
      sortable: true,
      cell: (row) => {
        const meta = STATUS_CONFIG[row.status] || STATUS_CONFIG.present;
        return (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.style}`}>
            {meta.label}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <button
          type="button"
          onClick={() => setOverrideRecord({ ...row })}
          className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="Manual Override"
          aria-label={`Adjust attendance for ${row.employee?.user?.full_name || "employee"}`}
        >
          <Edit2 className="h-3.5 w-3.5" aria-hidden="true" /> Adjust
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today's Attendance Roster"
        description="Live workforce check-ins, punch records, remote status, and compliance tracking."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Attendance", href: "/admin/attendance/today" },
          { label: "Daily Roster" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/attendance/calendar"
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Calendar className="h-4 w-4" aria-hidden="true" /> Calendar View
            </Link>
            <ExportButton
              data={exportData}
              columns={exportColumns}
              filename={`attendance-${new Date().toISOString().slice(0, 10)}`}
            />
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Present / WFH</span>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{presentCount} staff</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Late Arrivals</span>
          <p className="mt-1 text-2xl font-bold text-amber-600">{lateCount} staff</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">On Approved Leave</span>
          <p className="mt-1 text-2xl font-bold text-indigo-600">{leaveCount} staff</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Unaccounted / Absent</span>
          <p className="mt-1 text-2xl font-bold text-rose-600">{absentCount} staff</p>
        </div>
      </div>

      {/* Main DataTable with loading skeleton */}
      <DataTable
        columns={columns}
        data={attendance}
        loading={loading}
        emptyTitle="No attendance records"
        emptyDescription="No logs recorded for today yet."
      />

      {/* Override Modal */}
      {overrideRecord && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="adjust-attendance-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in">
            <h3 id="adjust-attendance-title" className="text-lg font-semibold text-foreground">Adjust Attendance Record</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Modify timestamps or override status for {overrideRecord.employee?.user?.full_name}.
            </p>

            <form onSubmit={handleOverrideSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="adjust-status" className="text-xs font-medium text-foreground">Status</label>
                <select
                  id="adjust-status"
                  value={overrideRecord.status}
                  onChange={(e) =>
                    setOverrideRecord({ ...overrideRecord, status: e.target.value as AttendanceStatus })
                  }
                  className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="present">Present</option>
                  <option value="late">Late Arrival</option>
                  <option value="half_day">Half Day</option>
                  <option value="wfh">Work From Home (WFH)</option>
                  <option value="leave">On Leave</option>
                  <option value="absent">Absent</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="adjust-checkin" className="text-xs font-medium text-foreground">Check-in Time</label>
                  <input
                    id="adjust-checkin"
                    type="time"
                    value={overrideRecord.check_in ? overrideRecord.check_in.slice(11, 16) : ""}
                    onChange={(e) =>
                      setOverrideRecord({
                        ...overrideRecord,
                        check_in: e.target.value ? `${overrideRecord.date}T${e.target.value}:00Z` : undefined,
                      })
                    }
                    className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="adjust-checkout" className="text-xs font-medium text-foreground">Check-out Time</label>
                  <input
                    id="adjust-checkout"
                    type="time"
                    value={overrideRecord.check_out ? overrideRecord.check_out.slice(11, 16) : ""}
                    onChange={(e) =>
                      setOverrideRecord({
                        ...overrideRecord,
                        check_out: e.target.value ? `${overrideRecord.date}T${e.target.value}:00Z` : undefined,
                      })
                    }
                    className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="adjust-hours" className="text-xs font-medium text-foreground">Working Hours</label>
                <input
                  id="adjust-hours"
                  type="number"
                  step="0.1"
                  min="0"
                  max="24"
                  value={overrideRecord.working_hours || 0}
                  onChange={(e) =>
                    setOverrideRecord({
                      ...overrideRecord,
                      working_hours: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOverrideRecord(null)}
                  className="min-h-[44px] sm:min-h-0 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] sm:min-h-0 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
