/**
 * app/(manager)/manager/dashboard/page.tsx
 *
 * Scoped Manager Dashboard:
 *  - Scoped to active manager's assigned clients and direct team
 *  - Team attendance status today
 *  - Assigned workload and capacity
 *  - Pending review tasks and overdue work alerts
 *  - Recent client activity feed (Timeline)
 *  - Quick actions (assign task, log activity, review leaves)
 */

"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  clientsApi,
  employeesApi,
  tasksApi,
  attendanceApi,
  activitiesApi,
  leaveRequestsApi,
  type Client,
  type Employee,
  type Task,
  type Attendance,
  type ClientActivity,
  type LeaveRequest,
} from "@/lib/api";
import {
  useCurrentManager,
  filterClientsForManager,
  filterEmployeesForManager,
  filterTasksForManager,
  filterAttendanceForManager,
  filterLeaveRequestsForManager,
} from "@/lib/permissions/manager";
import { Timeline, type TimelineEvent } from "@/components/crm/Timeline";
import { StatCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Briefcase,
  CheckCircle2,
  ClockAlert,
  CalendarCheck,
  AlertTriangle,
  ArrowRight,
  FileCheck2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";

export default function ManagerDashboardPage() {
  const { manager } = useCurrentManager();
  const [loading, setLoading] = useState(true);

  const [rawClients, setRawClients] = useState<Client[]>([]);
  const [rawEmployees, setRawEmployees] = useState<Employee[]>([]);
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [rawAttendance, setRawAttendance] = useState<Attendance[]>([]);
  const [rawActivities, setRawActivities] = useState<ClientActivity[]>([]);
  const [rawLeaves, setRawLeaves] = useState<LeaveRequest[]>([]);

  // Load raw data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [c, e, t, a, l] = await Promise.all([
          clientsApi.getAll(),
          employeesApi.getAll(),
          tasksApi.getAll(),
          attendanceApi.getToday(),
          leaveRequestsApi.getAll({ status: "pending" }),
        ]);
        setRawClients(c);
        setRawEmployees(e);
        setRawTasks(t);
        setRawAttendance(a);
        setRawLeaves(l);

        // Fetch activities for all clients
        const actPromises = c.map((client) => activitiesApi.getByClientId(client.id));
        const actResults = await Promise.all(actPromises);
        setRawActivities(actResults.flat());
      } catch {
        toast.error("Failed to load manager dashboard metrics");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [manager.userId]);

  // ── Scoped Data Computation ───────────────────────────────────────────────
  const scopedClients = useMemo(
    () => filterClientsForManager(rawClients, manager.userId),
    [rawClients, manager.userId]
  );

  const clientIds = useMemo(() => scopedClients.map((c) => c.id), [scopedClients]);

  const scopedTeam = useMemo(
    () => filterEmployeesForManager(rawEmployees, manager),
    [rawEmployees, manager]
  );

  const teamEmployeeIds = useMemo(() => scopedTeam.map((e) => e.id), [scopedTeam]);
  const teamUserIds = useMemo(() => scopedTeam.map((e) => e.user_id), [scopedTeam]);

  const scopedTasks = useMemo(
    () => filterTasksForManager(rawTasks, manager.userId, clientIds, teamUserIds),
    [rawTasks, manager.userId, clientIds, teamUserIds]
  );

  const scopedAttendance = useMemo(
    () => filterAttendanceForManager(rawAttendance, teamEmployeeIds),
    [rawAttendance, teamEmployeeIds]
  );

  const scopedLeaves = useMemo(
    () => filterLeaveRequestsForManager(rawLeaves, teamEmployeeIds),
    [rawLeaves, teamEmployeeIds]
  );

  const scopedActivities = useMemo(() => {
    const set = new Set(clientIds);
    return rawActivities
      .filter((act) => set.has(act.client_id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [rawActivities, clientIds]);

  // Calculations
  const presentToday = scopedAttendance.filter(
    (a) => a.status === "present" || a.status === "wfh"
  ).length;
  const attendanceRate = scopedTeam.length > 0 ? Math.round((presentToday / scopedTeam.length) * 100) : 100;

  const reviewTasks = scopedTasks.filter((t) => t.status === "review");
  const overdueTasks = scopedTasks.filter(
    (t) => t.due_date && new Date(t.due_date).getTime() < Date.now() && t.status !== "completed"
  );
  const totalPortfolioValue = scopedClients.reduce((sum, c) => sum + (c.total_revenue || 0), 0);

  // Workload Chart Data
  const workloadData = useMemo(() => {
    return scopedTeam.map((member) => {
      const memberTasks = scopedTasks.filter((t) => t.assignee_id === member.user_id);
      const completed = memberTasks.filter((t) => t.status === "completed").length;
      const pending = memberTasks.filter((t) => t.status !== "completed").length;
      return {
        name: member.user?.full_name?.split(" ")[0] || member.designation,
        Active: pending,
        Completed: completed,
      };
    });
  }, [scopedTeam, scopedTasks]);

  // Timeline Events for client activity feed
  const timelineEvents: TimelineEvent[] = useMemo(() => {
    return scopedActivities.slice(0, 5).map((a) => {
      const client = scopedClients.find((c) => c.id === a.client_id);
      return {
        id: a.id,
        type: a.type === "call" ? "call" : a.type === "meeting" ? "meeting" : "note",
        title: `${client?.company_name || "Client"}: ${a.type.toUpperCase()}`,
        description: a.content,
        createdAt: a.created_at,
        author: {
          name: a.creator?.full_name || "Team Member",
        },
      };
    });
  }, [scopedActivities, scopedClients]);

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in" role="status" aria-busy="true">
        <span className="sr-only">Loading manager dashboard...</span>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-border bg-card p-6 lg:col-span-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="rounded-xl border border-border bg-card p-6 lg:col-span-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Assigned Clients",
      value: scopedClients.length.toString(),
      subtext: `SAR ${totalPortfolioValue.toLocaleString()} active value`,
      icon: Briefcase,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      href: "/manager/clients",
    },
    {
      label: "Team Headcount",
      value: scopedTeam.length.toString(),
      subtext: `${manager.departmentName} Dept`,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      href: "/manager/team",
    },
    {
      label: "Today's Attendance",
      value: `${presentToday} / ${scopedTeam.length}`,
      subtext: `${attendanceRate}% on duty today`,
      icon: CalendarCheck,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      href: "/manager/attendance/team",
    },
    {
      label: "Tasks Awaiting Review",
      value: reviewTasks.length.toString(),
      subtext: "Require manager approval",
      icon: CheckCircle2,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      href: "/manager/kanban",
    },
    {
      label: "Overdue Items",
      value: overdueTasks.length.toString(),
      subtext: overdueTasks.length > 0 ? "Urgent attention required" : "All deadlines on track",
      icon: ClockAlert,
      color: overdueTasks.length > 0 ? "text-rose-500" : "text-emerald-500",
      bg: overdueTasks.length > 0 ? "bg-rose-500/10" : "bg-emerald-500/10",
      border: overdueTasks.length > 0 ? "border-rose-500/20" : "border-emerald-500/20",
      href: "/manager/tasks",
    },
    {
      label: "Pending Leaves",
      value: scopedLeaves.length.toString(),
      subtext: scopedLeaves.length > 0 ? "Action required" : "All approvals cleared",
      icon: FileCheck2,
      color: scopedLeaves.length > 0 ? "text-orange-500" : "text-slate-500",
      bg: scopedLeaves.length > 0 ? "bg-orange-500/10" : "bg-slate-500/10",
      border: scopedLeaves.length > 0 ? "border-orange-500/20" : "border-slate-500/20",
      href: "/manager/leave-approvals",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Scope Banner & Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Welcome back, {manager.fullName}
            </h1>
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-500">
              {manager.designation}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of your assigned clients in <strong className="text-foreground">{manager.departmentName}</strong> and direct team activities.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/manager/kanban"
            className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-2 rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white shadow-glow-amber transition-all hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <span>Open Kanban</span>
          </Link>
          <Link
            href="/manager/leave-approvals"
            className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            <FileCheck2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span>Review Leaves</span>
            {scopedLeaves.length > 0 && (
              <span className="ml-1 rounded-full bg-orange-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {scopedLeaves.length}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className={`group flex flex-col justify-between rounded-xl border ${kpi.border} bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.bg}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} aria-hidden="true" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold tracking-tight text-foreground">{kpi.value}</div>
                <p className="mt-1 text-[11px] text-muted-foreground truncate">{kpi.subtext}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Overdue Items Alert Banner if any */}
      {overdueTasks.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-600 dark:text-rose-400">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <div className="text-sm">
              <span className="font-semibold">Urgent Work Alert:</span> You have{" "}
              <strong>{overdueTasks.length}</strong> task(s) past due date under your management.
            </div>
          </div>
          <Link
            href="/manager/tasks"
            className="inline-flex min-h-[44px] sm:min-h-0 items-center gap-1 text-xs font-semibold underline underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            Review Overdue Tasks <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* Middle Row: Team Attendance Today & Workload Distribution */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Team Attendance Today */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Team Attendance Today</h2>
                <p className="text-xs text-muted-foreground">Direct reports and department presence</p>
              </div>
              <Link
                href="/manager/attendance/team"
                className="text-xs font-semibold text-amber-500 hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
              >
                Full Roster <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-5 divide-y divide-border">
              {scopedTeam.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">No direct team members found.</p>
              ) : (
                scopedTeam.map((emp) => {
                  const att = scopedAttendance.find((a) => a.employee_id === emp.id);
                  const status = att?.status || (emp.employment_status === "on_leave" ? "leave" : "present");

                  const badgeClass =
                    status === "present"
                      ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                      : status === "late"
                      ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                      : status === "leave"
                      ? "bg-purple-500/15 text-purple-600 border-purple-500/30"
                      : "bg-slate-500/15 text-slate-500 border-slate-500/30";

                  return (
                    <div key={emp.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted font-bold text-xs text-foreground">
                          {emp.user?.full_name?.slice(0, 2).toUpperCase() || "EM"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{emp.user?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{emp.designation}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="hidden sm:inline text-xs text-muted-foreground">
                          {att?.check_in ? `In: ${att.check_in.slice(11, 16)}` : "08:30 AM"}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${badgeClass}`}
                        >
                          {status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex items-center justify-between">
            <span>Overall Today&apos;s Punctuality: <strong>{attendanceRate}%</strong></span>
            <span>Total Team: <strong>{scopedTeam.length} members</strong></span>
          </div>
        </div>

        {/* Assigned Team Workload */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Team Workload Distribution</h2>
                <p className="text-xs text-muted-foreground">Active vs completed tasks per team member</p>
              </div>
              <Link
                href="/manager/kanban"
                className="text-xs font-semibold text-amber-500 hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
              >
                Kanban View <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-4 h-64 w-full">
              {workloadData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No workload data available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="Active" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="mt-2 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" aria-hidden="true" /> Active Tasks
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" aria-hidden="true" /> Completed
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Pending Review Tasks & Client Activity Stream */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Pending Review Tasks */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Tasks Awaiting Manager Review</h2>
              <p className="text-xs text-muted-foreground">Delivered by team members ready for sign-off</p>
            </div>
            <Link
              href="/manager/tasks"
              className="text-xs font-semibold text-amber-500 hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
            >
              All Tasks ({scopedTasks.length}) <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-5 divide-y divide-border">
            {reviewTasks.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 opacity-60" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-foreground">All reviews cleared!</p>
                <p className="text-xs text-muted-foreground">No tasks currently waiting for manager sign-off.</p>
              </div>
            ) : (
              reviewTasks.slice(0, 4).map((task) => (
                <div key={task.id} className="flex items-center justify-between py-3.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/manager/tasks/${task.id}`}
                        className="text-sm font-medium text-foreground hover:text-amber-500 transition-colors focus-visible:outline-none focus-visible:underline"
                      >
                        {task.title}
                      </Link>
                      <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-purple-600 dark:text-purple-400">
                        In Review
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Assignee: {task.assignee?.full_name || "Unassigned"}</span>
                      <span>•</span>
                      <span>Client: {task.client?.company_name || "Internal"}</span>
                      {task.due_date && (
                        <>
                          <span>•</span>
                          <span>Due: {task.due_date}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/manager/tasks/${task.id}`}
                    className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    Review
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Client Activity Stream */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Assigned Client Activity</h2>
              <p className="text-xs text-muted-foreground">Recent communications & updates</p>
            </div>
            <Link
              href="/manager/clients"
              className="text-xs font-semibold text-amber-500 hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
            >
              Clients ({scopedClients.length}) <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {timelineEvents.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No recent activity recorded for your assigned clients.
            </p>
          ) : (
            <Timeline events={timelineEvents} canAddNote={false} />
          )}
        </div>
      </div>
    </div>
  );
}
