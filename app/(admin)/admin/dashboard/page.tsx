/**
 * app/(admin)/admin/dashboard/page.tsx
 *
 * Comprehensive Admin Dashboard with 6 KPI stat cards,
 * 5 interactive Recharts visualizations (client growth, lead conversion,
 * attendance trend, task completion, team workload), quick actions,
 * and live activity feed.
 */

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  dashboardApi,
  activitiesApi,
  followUpsApi,
  type ClientActivity,
  type FollowUp,
} from "@/lib/api";
import { Skeleton, StatCardSkeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Users,
  Briefcase,
  CalendarCheck,
  ClockAlert,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
  Plus,
  PhoneCall,
  FileCheck,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof dashboardApi.getStats>> | null>(null);
  const [chartsData, setChartsData] = useState<Awaited<ReturnType<typeof dashboardApi.getChartsData>> | null>(null);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [s, c, act, fu] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getChartsData(),
          activitiesApi.getByClientId("c-1"),
          followUpsApi.getAll({ status: "pending" }),
        ]);
        setStats(s);
        setChartsData(c);
        setActivities(act.slice(0, 5));
        setFollowUps(fu.slice(0, 4));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !stats || !chartsData) {
    return (
      <div className="space-y-6" role="status" aria-busy="true">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-28 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>
        {/* 6 Stat Skeletons */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        {/* Chart Skeletons */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Clients",
      value: stats.totalClients.value,
      delta: stats.totalClients.delta,
      icon: Briefcase,
      color: "text-teal-500",
      bg: "bg-teal-500/10",
      border: "border-teal-500/20",
      href: "/admin/crm/clients",
    },
    {
      label: "Active Leads",
      value: stats.activeLeads.value,
      delta: stats.activeLeads.delta,
      icon: TrendingUp,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      href: "/admin/crm/leads",
    },
    {
      label: "Active Employees",
      value: stats.activeEmployees.value,
      delta: stats.activeEmployees.delta,
      icon: Users,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
      border: "border-sky-500/20",
      href: "/admin/employees",
    },
    {
      label: "Today's Attendance",
      value: stats.todayAttendance.value,
      delta: stats.todayAttendance.delta,
      icon: CalendarCheck,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      href: "/admin/attendance/today",
    },
    {
      label: "Pending / Overdue Tasks",
      value: stats.pendingOverdueTasks.value,
      delta: stats.pendingOverdueTasks.delta,
      icon: ClockAlert,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
      href: "/admin/projects/kanban",
    },
    {
      label: "Task Completion Rate",
      value: stats.completionRate.value,
      delta: stats.completionRate.delta,
      icon: CheckCircle2,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
      href: "/admin/reports/tasks",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header with Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Executive Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enterprise analytics, CRM pipeline overview, and operations summary.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/crm/clients/new"
            className="inline-flex min-h-[44px] sm:min-h-0 items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <Plus className="h-4 w-4" />
            Add Client
          </Link>
          <Link
            href="/admin/crm/leads"
            className="inline-flex min-h-[44px] sm:min-h-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            New Lead
          </Link>
          <Link
            href="/admin/projects/kanban"
            className="inline-flex min-h-[44px] sm:min-h-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Kanban Board
          </Link>
        </div>
      </div>

      {/* 6 KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className={`group relative overflow-hidden rounded-xl border ${card.border} bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {card.delta}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                  {card.value}
                </p>
              </div>
              <div className="absolute right-2 bottom-2 opacity-0 transition-opacity group-hover:opacity-100">
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Charts Grid - Row 1: Client Growth (Area) & Lead Conversion (Bar) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Client Growth Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Client & Revenue Growth</h2>
              <p className="text-xs text-muted-foreground">Cumulative clients and ARR trajectory (SAR)</p>
            </div>
            <Link href="/admin/crm/clients" className="text-xs font-medium text-teal-600 hover:underline">
              View Clients &rarr;
            </Link>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartsData.clientGrowth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="clientGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue (SAR)"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#clientGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Conversion Pipeline */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Lead Pipeline Breakdown</h2>
              <p className="text-xs text-muted-foreground">Active prospect opportunities across funnel stages</p>
            </div>
            <Link href="/admin/crm/leads" className="text-xs font-medium text-amber-600 hover:underline">
              View Leads &rarr;
            </Link>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartsData.leadConversion} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" name="Opportunities" radius={[6, 6, 0, 0]} fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Grid - Row 2: Attendance Trend, Task Completion, Team Workload */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Attendance Trend */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Attendance Trend (%)</h2>
              <p className="text-xs text-muted-foreground">Daily workforce presence</p>
            </div>
            <Link href="/admin/attendance/calendar" className="text-xs text-emerald-600 hover:underline">
              Calendar
            </Link>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartsData.attendanceTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line type="monotone" dataKey="present" name="Present %" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="late" name="Late %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Completion */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Task Throughput</h2>
              <p className="text-xs text-muted-foreground">Created vs completed weekly</p>
            </div>
            <Link href="/admin/reports/tasks" className="text-xs text-indigo-600 hover:underline">
              Report
            </Link>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartsData.taskCompletion} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
                <Bar dataKey="created" name="Created" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Workload */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Team Workload Allocation</h2>
              <p className="text-xs text-muted-foreground">Active tasks vs bandwidth</p>
            </div>
            <Link href="/admin/employees/departments" className="text-xs text-sky-600 hover:underline">
              Depts
            </Link>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartsData.teamWorkload}
                margin={{ top: 5, right: 10, left: 20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis dataKey="department" type="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={70} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="tasks" name="Active Tasks" fill="#0284c7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section: Urgent Follow-ups & Recent Activities */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Urgent Follow-ups */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-teal-600" />
              <h2 className="text-base font-semibold text-foreground">Upcoming Follow-ups</h2>
            </div>
            <Link href="/admin/crm/follow-ups" className="text-xs font-medium text-teal-600 hover:underline">
              View All &rarr;
            </Link>
          </div>
          <div className="space-y-3">
            {followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending follow-ups due.</p>
            ) : (
              followUps.map((fu) => (
                <div
                  key={fu.id}
                  className="flex items-start justify-between rounded-lg border border-border/60 bg-muted/30 p-3 transition hover:bg-muted/60"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{fu.next_action}</p>
                    <p className="text-xs text-muted-foreground">
                      Client: <span className="font-medium text-foreground">{fu.client?.company_name}</span>
                    </p>
                  </div>
                  <span className="rounded bg-teal-500/10 px-2 py-0.5 text-xs font-medium text-teal-600 dark:text-teal-400">
                    {new Date(fu.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Activity Timeline Preview */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-teal-600" />
              <h2 className="text-base font-semibold text-foreground">Recent Client Activities</h2>
            </div>
            <Link href="/admin/crm/clients/c-1" className="text-xs font-medium text-teal-600 hover:underline">
              Audit Feed &rarr;
            </Link>
          </div>
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activities recorded.</p>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-teal-500" />
                  <div className="flex-1 space-y-0.5">
                    <p className="text-foreground">{act.content}</p>
                    <p className="text-xs text-muted-foreground">
                      By {act.creator?.full_name || "Admin"} &bull;{" "}
                      {new Date(act.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
