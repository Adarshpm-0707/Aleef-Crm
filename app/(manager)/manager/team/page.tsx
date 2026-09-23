/**
 * app/(manager)/manager/team/page.tsx
 *
 * Scoped Team Oversight for Managers:
 * - Shows only direct reports and department members
 * - Today's presence, task loads, contact info
 * - No user-role management or deletion (enforced)
 * - Click through to individual team member view
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  employeesApi,
  tasksApi,
  attendanceApi,
  type Employee,
  type Task,
  type Attendance,
} from "@/lib/api";
import {
  useCurrentManager,
  filterEmployeesForManager,
} from "@/lib/permissions/manager";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar, type FilterBarFilters } from "@/components/shared/FilterBar";
import { CardSkeleton } from "@/components/ui/skeleton";
import {
  Users,
  CalendarCheck,
  Briefcase,
  Mail,
  Phone,
  ArrowRight,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

export default function ManagerTeamPage() {
  const { manager } = useCurrentManager();
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterBarFilters>({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [eList, tList, aList] = await Promise.all([
        employeesApi.getAll(),
        tasksApi.getAll(),
        attendanceApi.getToday(),
      ]);
      setAllEmployees(eList);
      setTasks(tList);
      setTodayAttendance(aList);
    } catch {
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, manager.userId]);

  // Scoped to current manager only!
  const scopedTeam = useMemo(() => {
    return filterEmployeesForManager(allEmployees, manager);
  }, [allEmployees, manager]);

  // Filter team
  const filteredTeam = useMemo(() => {
    return scopedTeam.filter((emp) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matches =
          emp.user?.full_name?.toLowerCase().includes(q) ||
          emp.employee_id.toLowerCase().includes(q) ||
          emp.designation.toLowerCase().includes(q) ||
          emp.user?.email.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [scopedTeam, filters]);

  // Metrics
  const presentCount = scopedTeam.filter((emp) => {
    const att = todayAttendance.find((a) => a.employee_id === emp.id);
    return att?.status === "present" || att?.status === "wfh";
  }).length;

  const onLeaveCount = scopedTeam.filter((emp) => {
    const att = todayAttendance.find((a) => a.employee_id === emp.id);
    return att?.status === "leave" || emp.employment_status === "on_leave";
  }).length;

  const activeTaskCount = tasks.filter((t) => {
    return scopedTeam.some((e) => e.user_id === t.assignee_id && t.status !== "completed");
  }).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="My Team Members"
        description={`Direct reports and staff in ${manager.departmentName} managed by ${manager.fullName}. Monitor work assignments, attendance, and performance.`}
        breadcrumbs={[
          { label: "Dashboard", href: "/manager/dashboard" },
          { label: "Team" },
        ]}
      />

      {/* Team KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Team Size</p>
            <p className="text-2xl font-bold text-foreground mt-1">{scopedTeam.length} members</p>
          </div>
          <Users className="h-8 w-8 text-blue-500 opacity-60" aria-hidden="true" />
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Present Today</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {presentCount} / {scopedTeam.length}
            </p>
          </div>
          <CalendarCheck className="h-8 w-8 text-emerald-500 opacity-60" aria-hidden="true" />
        </div>

        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">On Leave</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
              {onLeaveCount}
            </p>
          </div>
          <Clock className="h-8 w-8 text-purple-500 opacity-60" aria-hidden="true" />
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Assigned Tasks</p>
            <p className="text-2xl font-bold text-amber-500 mt-1">{activeTaskCount}</p>
          </div>
          <Briefcase className="h-8 w-8 text-amber-500 opacity-60" aria-hidden="true" />
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
      />

      {/* Team Cards Grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-busy="true">
          <span className="sr-only">Loading team members...</span>
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filteredTeam.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-50" aria-hidden="true" />
          <h3 className="mt-3 text-base font-semibold text-foreground">No team members found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            No employees match the current filter in {manager.departmentName}.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTeam.map((emp) => {
            const att = todayAttendance.find((a) => a.employee_id === emp.id);
            const status = att?.status || (emp.employment_status === "on_leave" ? "leave" : "present");

            const memberTasks = tasks.filter((t) => t.assignee_id === emp.user_id);
            const activeTasks = memberTasks.filter((t) => t.status !== "completed").length;
            const completedTasks = memberTasks.filter((t) => t.status === "completed").length;

            const initials = emp.user?.full_name
              ? emp.user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
              : "EM";

            return (
              <div
                key={emp.id}
                className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-base font-bold text-amber-500">
                        {initials}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground group-hover:text-amber-500 transition-colors">
                          {emp.user?.full_name}
                        </h3>
                        <p className="text-xs text-muted-foreground">{emp.designation}</p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                        status === "present"
                          ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                          : status === "late"
                          ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                          : status === "leave"
                          ? "bg-purple-500/15 text-purple-600 border-purple-500/30"
                          : "bg-slate-500/15 text-slate-500 border-slate-500/30"
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="truncate max-w-[170px]">{emp.user?.email}</span>
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">
                        {emp.employee_id}
                      </span>
                    </div>
                    {emp.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{emp.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Task Load Progress */}
                  <div className="mt-4 rounded-lg bg-muted/40 p-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Task Assignments:</span>
                      <span className="font-semibold text-foreground">{activeTasks} Active / {completedTasks} Done</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-amber-500 transition-all"
                        style={{
                          width: `${
                            memberTasks.length > 0
                              ? Math.round((completedTasks / memberTasks.length) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Reports to: {manager.fullName}</span>
                  <Link
                    href={`/manager/team/${emp.id}`}
                    className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1 text-xs font-semibold text-amber-500 hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
                  >
                    View Profile & Tasks <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Security notice */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" aria-hidden="true" />
        <span>
          Manager RBAC Boundary: You have operational oversight of your team’s workload and attendance. User role changes and account deletions are restricted to system Administrators.
        </span>
      </div>
    </div>
  );
}
