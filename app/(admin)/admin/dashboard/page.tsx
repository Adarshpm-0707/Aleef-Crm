/**
 * app/(admin)/admin/dashboard/page.tsx
 *
 * Ultra-Modern Minimalist Admin Executive Dashboard:
 * - Responsive 6-KPI metrics grid with micro-elevation and trend indicators
 * - Interactive visualizations (Revenue/Client Growth, Lead Pipeline, Attendance, Task Throughput)
 * - Quick Action command bar with instant routing
 * - Live CRM activities and upcoming follow-ups timeline
 * - Optimized for mobile view, tablet view, and desktop view
 */

"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  FolderKanban,
  FileSpreadsheet,
  Activity,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof dashboardApi.getStats>> | null>(null);
  const [chartsData, setChartsData] = useState<Awaited<ReturnType<typeof dashboardApi.getChartsData>> | null>(null);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChartTab, setActiveChartTab] = useState<"growth" | "workforce">("growth");

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

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: "Total Clients",
        value: stats.totalClients.value,
        delta: stats.totalClients.delta,
        icon: Briefcase,
        color: "text-teal-600 dark:text-teal-400",
        bg: "bg-teal-500/10",
        border: "border-teal-500/20",
        href: "/admin/crm/clients",
      },
      {
        label: "Active Leads",
        value: stats.activeLeads.value,
        delta: stats.activeLeads.delta,
        icon: TrendingUp,
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
        href: "/admin/crm/leads",
      },
      {
        label: "Active Staff",
        value: stats.activeEmployees.value,
        delta: stats.activeEmployees.delta,
        icon: Users,
        color: "text-sky-600 dark:text-sky-400",
        bg: "bg-sky-500/10",
        border: "border-sky-500/20",
        href: "/admin/employees",
      },
      {
        label: "Today Attendance",
        value: stats.todayAttendance.value,
        delta: stats.todayAttendance.delta,
        icon: CalendarCheck,
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        href: "/admin/attendance/today",
      },
      {
        label: "Pending Tasks",
        value: stats.pendingOverdueTasks.value,
        delta: stats.pendingOverdueTasks.delta,
        icon: ClockAlert,
        color: "text-rose-600 dark:text-rose-400",
        bg: "bg-rose-500/10",
        border: "border-rose-500/20",
        href: "/admin/projects/kanban",
      },
      {
        label: "Completion Rate",
        value: stats.completionRate.value,
        delta: stats.completionRate.delta,
        icon: CheckCircle2,
        color: "text-indigo-600 dark:text-indigo-400",
        bg: "bg-indigo-500/10",
        border: "border-indigo-500/20",
        href: "/admin/reports/tasks",
      },
    ];
  }, [stats]);

  if (loading || !stats || !chartsData) {
    return (
      <div className="space-y-6" role="status" aria-busy="true">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-4 w-96 max-w-full rounded-lg" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>
        {/* 6 Stat Skeletons */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        {/* Chart Skeletons */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm space-y-4">
            <Skeleton className="h-5 w-48 rounded-lg" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm space-y-4">
            <Skeleton className="h-5 w-48 rounded-lg" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* ── 1. Minimalist Hero Welcome & Quick Action Bar ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-teal-500/[0.04] p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
                Operations Live
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                • {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Admin Command Center
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Enterprise CRM analytics, pipeline health, client portfolios, and operational workforce performance.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <Link
              href="/admin/crm/clients/new"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-500 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <Plus className="h-4 w-4" />
              Add Client
            </Link>
            <Link
              href="/admin/crm/leads"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 text-xs font-medium text-foreground shadow-xs transition hover:bg-muted hover:border-border active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
              New Lead
            </Link>
            <Link
              href="/admin/projects/kanban"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 text-xs font-medium text-foreground shadow-xs transition hover:bg-muted hover:border-border active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FolderKanban className="h-3.5 w-3.5 text-indigo-500" />
              Kanban
            </Link>
            <Link
              href="/admin/reports/crm"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 text-xs font-medium text-foreground shadow-xs transition hover:bg-muted hover:border-border active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-teal-500" />
              Reports
            </Link>
          </div>
        </div>
      </div>

      {/* ── 2. Responsive 6-KPI Stat Cards Grid ── */}
      {/* Mobile: 2 cols, Tablet: 3 cols, Desktop: 6 cols */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border ${card.border} bg-card/95 p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <span className="inline-flex items-center text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {card.delta}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground truncate">{card.label}</p>
                <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {card.value}
                </p>
              </div>
              <div className="absolute right-2.5 bottom-2.5 opacity-0 transition-opacity group-hover:opacity-100">
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── 3. Interactive Visualizations Section ── */}
      <div className="space-y-4">
        {/* Section Header with View Toggle */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-600" />
              Business Intelligence & Analytics
            </h2>
            <p className="text-xs text-muted-foreground">
              Real-time trajectory of client acquisitions, sales funnel, and team execution.
            </p>
          </div>
          <div className="flex items-center rounded-xl border border-border/80 bg-muted/30 p-1">
            <button
              onClick={() => setActiveChartTab("growth")}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                activeChartTab === "growth"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Revenue & Pipeline
            </button>
            <button
              onClick={() => setActiveChartTab("workforce")}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                activeChartTab === "workforce"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Workforce & Output
            </button>
          </div>
        </div>

        {activeChartTab === "growth" ? (
          /* Tab 1: Client & Revenue Growth (Area) + Lead Pipeline (Bar) */
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Client Growth Chart */}
            <div className="rounded-2xl border border-border/70 bg-card/95 p-5 sm:p-6 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Client Revenue Trajectory</h3>
                  <p className="text-xs text-muted-foreground">Monthly contracted ARR volume in INR (₹)</p>
                </div>
                <Link href="/admin/crm/clients" className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline">
                  Client Directory &rarr;
                </Link>
              </div>
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartsData.clientGrowth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="clientGradMinimal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.6)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "12px",
                        boxShadow: "0 8px 20px -4px rgba(0,0,0,0.1)",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue (₹)"
                      stroke="#0d9488"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#clientGradMinimal)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Lead Pipeline Funnel */}
            <div className="rounded-2xl border border-border/70 bg-card/95 p-5 sm:p-6 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Lead Conversion Pipeline</h3>
                  <p className="text-xs text-muted-foreground">Prospect volume distributed across sales stages</p>
                </div>
                <Link href="/admin/crm/leads" className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline">
                  Lead Queue &rarr;
                </Link>
              </div>
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartsData.leadConversion} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.6)" vertical={false} />
                    <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "12px",
                        boxShadow: "0 8px 20px -4px rgba(0,0,0,0.1)",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" name="Opportunities" radius={[6, 6, 0, 0]} fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          /* Tab 2: Workforce & Execution Output (Attendance + Tasks) */
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Attendance Trend */}
            <div className="rounded-2xl border border-border/70 bg-card/95 p-5 sm:p-6 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Daily Attendance Trend (%)</h3>
                  <p className="text-xs text-muted-foreground">Daily present vs late attendance ratio</p>
                </div>
                <Link href="/admin/attendance/calendar" className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
                  Full Calendar &rarr;
                </Link>
              </div>
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartsData.attendanceTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.6)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <YAxis domain={[80, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                    />
                    <Line type="monotone" dataKey="present" name="Present %" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="late" name="Late %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Task Throughput */}
            <div className="rounded-2xl border border-border/70 bg-card/95 p-5 sm:p-6 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Weekly Task Throughput</h3>
                  <p className="text-xs text-muted-foreground">Engineering tickets created vs completed</p>
                </div>
                <Link href="/admin/reports/tasks" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                  Tasks Report &rarr;
                </Link>
              </div>
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartsData.taskCompletion} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.6)" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="created" name="Created" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Bottom Operations Row: Urgent Follow-ups & Live Feed ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Urgent Follow-ups Widget */}
        <div className="rounded-2xl border border-border/70 bg-card/95 p-5 sm:p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
                <PhoneCall className="h-3.5 w-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Pending CRM Follow-ups</h3>
                <p className="text-[11px] text-muted-foreground">High-priority client actions pending execution</p>
              </div>
            </div>
            <Link href="/admin/crm/follow-ups" className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline">
              View All &rarr;
            </Link>
          </div>

          <div className="space-y-2.5">
            {followUps.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No urgent follow-ups pending.</p>
            ) : (
              followUps.map((fu) => (
                <div
                  key={fu.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 transition-colors hover:bg-muted/40 hover:border-border"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{fu.next_action}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Client: <span className="font-medium text-foreground">{fu.client?.company_name}</span>
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                    {new Date(fu.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live CRM Activity Audit Timeline */}
        <div className="rounded-2xl border border-border/70 bg-card/95 p-5 sm:p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
                <FileCheck className="h-3.5 w-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Recent Activity Stream</h3>
                <p className="text-[11px] text-muted-foreground">Live updates from team members and clients</p>
              </div>
            </div>
            <Link href="/admin/crm/clients/c-1" className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline">
              Audit Stream &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No recent activities recorded.</p>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500 ring-2 ring-teal-500/20" />
                  <div className="flex-1 space-y-0.5 min-w-0">
                    <p className="text-foreground leading-relaxed font-medium">{act.content}</p>
                    <p className="text-[11px] text-muted-foreground">
                      By {act.creator?.full_name || "Admin"} •{" "}
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
