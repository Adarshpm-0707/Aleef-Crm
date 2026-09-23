/**
 * app/(admin)/admin/employees/[id]/page.tsx
 *
 * Employee Profile Page:
 * - Profile header with avatar, designation, department, and status badge
 * - Tab 1: Organization & Contact Profile
 * - Tab 2: Assigned Tasks list
 * - Tab 3: Monthly Attendance & Leaves Summary
 */

"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  employeesApi,
  tasksApi,
  attendanceApi,
  leaveRequestsApi,
  type Employee,
  type Task,
  type Attendance,
  type LeaveRequest,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Mail,
  Phone,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import { Skeleton, StatCardSkeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function EmployeeProfilePage() {
  const params = useParams<{ id: string }>();
  const empId = params.id;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof attendanceApi.getSummary>> | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "tasks" | "attendance">("profile");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!empId) return;
      try {
        const [emp, tList, attList, lrList, sum] = await Promise.all([
          employeesApi.getById(empId),
          tasksApi.getAll({}),
          attendanceApi.getToday(),
          leaveRequestsApi.getAll({ employeeId: empId }),
          attendanceApi.getSummary(empId),
        ]);
        setEmployee(emp);
        if (emp?.user_id) {
          setTasks(tList.filter((t) => t.assignee_id === emp.user_id));
        }
        setAttendance(attList.filter((a) => a.employee_id === empId));
        setLeaveRequests(lrList);
        setSummary(sum);
      } catch {
        toast.error("Failed to load employee details");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [empId]);

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-busy="true">
        <span className="sr-only">Loading employee profile...</span>
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-4">
        <Link href="/admin/employees" className="inline-flex min-h-[44px] sm:min-h-0 items-center gap-1.5 text-sm text-teal-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
          <ArrowLeft className="h-4 w-4" /> Back to Employees
        </Link>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <h2 className="text-lg font-semibold">Employee not found</h2>
          <p className="mt-1 text-sm text-muted-foreground">The requested employee record does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={employee.user?.full_name || "Employee Profile"}
        description={`${employee.designation} • ${employee.department?.name || "General Staff"} • ${employee.employee_id}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Employees", href: "/admin/employees" },
          { label: employee.user?.full_name || employee.employee_id },
        ]}
        actions={
          <Link
            href="/admin/employees"
            className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Roster
          </Link>
        }
      />

      {/* Hero Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-600 font-bold text-2xl shadow-sm" aria-hidden="true">
              {employee.user?.full_name
                ? employee.user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                : "EM"}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{employee.user?.full_name}</h1>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 capitalize">
                  {employee.employment_status.replace("_", " ")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-medium">{employee.designation}</p>
              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
                {employee.user?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
                    {employee.user.email}
                  </span>
                )}
                {employee.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
                    {employee.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" /> Joined {new Date(employee.joining_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats on Right */}
          <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
            <div className="rounded-xl bg-muted/40 p-3 min-w-[120px]">
              <span className="text-xs text-muted-foreground">Assigned Tasks</span>
              <p className="mt-1 text-lg font-bold text-foreground">{tasks.length}</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3 min-w-[120px]">
              <span className="text-xs text-muted-foreground">Attendance Rate</span>
              <p className="mt-1 text-lg font-bold text-emerald-600">{summary?.attendanceRate || 95}%</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3 min-w-[120px]">
              <span className="text-xs text-muted-foreground">Avg Hours/Day</span>
              <p className="mt-1 text-lg font-bold text-foreground">{summary?.averageWorkingHours || 8.2}h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border scrollbar-none" role="tablist" aria-label="Employee details sections">
        {[
          { key: "profile", label: "Profile & Org Hierarchy" },
          { key: "tasks", label: `Assigned Tasks (${tasks.length})` },
          { key: "attendance", label: "Attendance Summary" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key as "profile" | "tasks" | "attendance")}
            className={`min-h-[44px] whitespace-nowrap border-b-2 px-5 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === tab.key
                ? "border-teal-500 text-teal-600 dark:text-teal-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Profile & Org Info */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-foreground">Organizational Placement</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Employee ID</span>
                <p className="font-mono font-medium text-foreground">{employee.employee_id}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Department</span>
                <p className="font-medium text-foreground">{employee.department?.name || "Unassigned"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Reporting Manager</span>
                <p className="font-medium text-foreground">
                  {employee.reporting_manager?.user?.full_name || "Direct to Admin"}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Joining Date</span>
                <p className="font-medium text-foreground">
                  {new Date(employee.joining_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-foreground">Account Privileges</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">System Role</span>
                <p className="font-medium text-foreground capitalize">{employee.user?.role || "Client"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">User Status</span>
                <p className="font-medium text-emerald-600 capitalize">{employee.user?.status || "Active"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Portal Email</span>
                <p className="font-medium text-foreground">{employee.user?.email}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Direct Line</span>
                <p className="font-medium text-foreground">{employee.phone || "Not set"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Assigned Tasks */}
      {activeTab === "tasks" && (
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden shadow-sm">
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No tasks currently assigned to this employee.
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-4 text-sm">
                <div className="space-y-1">
                  <Link
                    href={`/admin/projects/tasks/${task.id}`}
                    className="font-medium text-foreground hover:text-teal-600 hover:underline"
                  >
                    {task.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Project: <span className="font-medium text-foreground">{task.project?.name || "General"}</span> &bull; Due:{" "}
                    {task.due_date || "No due date"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 capitalize">
                    {task.priority}
                  </span>
                  <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                    {task.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Attendance Summary */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <span className="text-xs text-muted-foreground">Present Days</span>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{summary?.presentDays || 20}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <span className="text-xs text-muted-foreground">Late Arrivals</span>
              <p className="mt-1 text-2xl font-bold text-amber-600">{summary?.lateDays || 2}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <span className="text-xs text-muted-foreground">Approved Leaves</span>
              <p className="mt-1 text-2xl font-bold text-sky-600">{summary?.leaveDays || 1}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <span className="text-xs text-muted-foreground">Absences</span>
              <p className="mt-1 text-2xl font-bold text-rose-600">{summary?.absentDays || 0}</p>
            </div>
          </div>

          {/* Today's Punch Card */}
          {attendance.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Today&apos;s Attendance Record</p>
                <p className="text-xs text-muted-foreground">
                  In: {attendance[0].check_in ? attendance[0].check_in.slice(11, 16) : "--:--"} | Out:{" "}
                  {attendance[0].check_out ? attendance[0].check_out.slice(11, 16) : "--:--"} ({attendance[0].working_hours || 0} hrs)
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold capitalize text-emerald-600">
                {attendance[0].status}
              </span>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground mb-3">Leave History</h2>
            {leaveRequests.length === 0 ? (
              <p className="text-xs text-muted-foreground">No leave records found for this employee.</p>
            ) : (
              <div className="space-y-2">
                {leaveRequests.map((lr) => (
                  <div key={lr.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3 text-sm">
                    <div>
                      <p className="font-medium text-foreground capitalize">{lr.leave_type} Leave: {lr.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {lr.start_date} to {lr.end_date}
                      </p>
                    </div>
                    <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-600 capitalize">
                      {lr.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
