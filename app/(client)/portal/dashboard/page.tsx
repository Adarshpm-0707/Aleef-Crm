/**
 * app/(client)/portal/dashboard/page.tsx
 *
 * Modern Minimalist Client Portal Dashboard:
 * - Executive header with company context and dedicated account manager SLA
 * - 4 Key client deliverable & workspace metric cards
 * - Multi-segment visual lifecycle progress distribution
 * - Active client project workspaces with live milestone progress
 * - Upcoming milestone deadlines with color-coded urgency tags
 * - Dedicated account manager VIP contact card
 * - Fully responsive across mobile, tablet, and desktop views
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  projectsApi,
  tasksApi,
  type Project,
  type Task,
  type TaskStatus,
} from "@/lib/api";
import {
  useCurrentClient,
  filterProjectsForClient,
  filterTasksForClient,
  calculateTaskBreakdown,
} from "@/lib/permissions/client";
import { StatCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import {
  FolderKanban,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ArrowRight,
  UserCheck,
  Mail,
  Phone,
  ShieldCheck,
  FileText,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; border: string }> = {
  todo: {
    label: "To Do",
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
  },
  in_progress: {
    label: "In Progress",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  review: {
    label: "In Review",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  completed: {
    label: "Completed",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
};

export default function ClientDashboardPage() {
  const { client } = useCurrentClient();
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [projList, taskList] = await Promise.all([
        projectsApi.getAll(),
        tasksApi.getAll(),
      ]);
      setAllProjects(projList);
      setAllTasks(taskList);
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, client.clientId]);

  // Client-scoped data
  const clientProjects = useMemo(
    () => filterProjectsForClient(allProjects, client.clientId),
    [allProjects, client.clientId]
  );

  const clientTasks = useMemo(
    () => filterTasksForClient(allTasks, client.clientId, clientProjects),
    [allTasks, client.clientId, clientProjects]
  );

  const breakdown = useMemo(() => calculateTaskBreakdown(clientTasks), [clientTasks]);

  // Upcoming deadlines (tasks not completed, sorted by due date)
  const upcomingDeadlines = useMemo(() => {
    return clientTasks
      .filter((t) => t.status !== "completed" && t.due_date)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 5);
  }, [clientTasks]);

  // Format due date difference
  const getDeadlineBadge = (dueDateStr?: string) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <AlertCircle className="h-3 w-3" aria-hidden="true" /> Overdue
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Clock className="h-3 w-3" aria-hidden="true" /> Due today
        </span>
      );
    }
    if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Clock className="h-3 w-3" aria-hidden="true" /> In {diffDays} {diffDays === 1 ? "day" : "days"}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-400 border border-sky-500/20">
        <Calendar className="h-3 w-3" aria-hidden="true" /> In {diffDays} days
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-busy="true">
        <span className="sr-only">Loading client portal dashboard...</span>
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-4">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-4 w-full rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* ── 1. Minimalist Client Executive Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-card via-card to-sky-500/[0.04] p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                </span>
                Verified Account: {client.companyName}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                • Active SLA Coverage
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Welcome back, {client.contactPerson.split(" ")[0]}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
              Real-time portal for {client.companyName} tracking deliverables, sprints, and project milestones.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/portal/projects"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-500 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <FolderKanban className="h-4 w-4" />
              Workspaces
            </Link>
            <Link
              href="/portal/invoices"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 text-xs font-medium text-foreground shadow-xs transition hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FileText className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              Invoices
            </Link>
          </div>
        </div>
      </div>

      {/* ── 2. Metric KPI Cards ── */}
      {/* Mobile: 2 cols, Tablet/Desktop: 4 cols */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Projects */}
        <Link
          href="/portal/projects"
          className="group rounded-2xl border border-border/70 bg-card/95 p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-sky-500/40"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Projects
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <FolderKanban className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {clientProjects.length}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs text-sky-600 dark:text-sky-400 font-semibold pt-2 border-t border-border/50">
            <span>View workspaces</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* In Progress */}
        <div className="rounded-2xl border border-border/70 bg-card/95 p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-amber-500/40">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              In Progress
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {breakdown.in_progress}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
            <span>Active development</span>
          </div>
        </div>

        {/* In Review */}
        <div className="rounded-2xl border border-border/70 bg-card/95 p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-purple-500/40">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              QA Validation
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {breakdown.review}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
            <span>Quality review phase</span>
          </div>
        </div>

        {/* Completed Deliverables */}
        <div className="rounded-2xl border border-border/70 bg-card/95 p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-emerald-500/40">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Completed
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {breakdown.completed}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold pt-2 border-t border-border/50">
            <span>{breakdown.completedPct}% completed</span>
          </div>
        </div>
      </div>

      {/* ── 3. Deliverables Status Breakdown Section ── */}
      <div className="rounded-2xl border border-border/70 bg-card/95 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/60">
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              Deliverables Lifecycle Distribution
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live status across {breakdown.total} total contractual milestones for {client.companyName}
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {breakdown.total} total items
          </span>
        </div>

        {/* Multi-Segment Visual Progress Bar */}
        <div
          className="mt-4 h-3.5 w-full overflow-hidden rounded-full bg-muted/60 flex"
          role="progressbar"
          aria-valuenow={breakdown.completedPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {breakdown.completedPct > 0 && (
            <div
              style={{ width: `${breakdown.completedPct}%` }}
              title={`Completed: ${breakdown.completed} (${breakdown.completedPct}%)`}
              className="bg-emerald-500 transition-all duration-500"
            />
          )}
          {breakdown.reviewPct > 0 && (
            <div
              style={{ width: `${breakdown.reviewPct}%` }}
              title={`In Review: ${breakdown.review} (${breakdown.reviewPct}%)`}
              className="bg-purple-500 transition-all duration-500"
            />
          )}
          {breakdown.inProgressPct > 0 && (
            <div
              style={{ width: `${breakdown.inProgressPct}%` }}
              title={`In Progress: ${breakdown.in_progress} (${breakdown.inProgressPct}%)`}
              className="bg-amber-500 transition-all duration-500"
            />
          )}
          {breakdown.todoPct > 0 && (
            <div
              style={{ width: `${breakdown.todoPct}%` }}
              title={`To Do: ${breakdown.todo} (${breakdown.todoPct}%)`}
              className="bg-slate-400 dark:bg-slate-600 transition-all duration-500"
            />
          )}
        </div>

        {/* Breakdown Legend Pills */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="flex items-center gap-2 rounded-xl border border-slate-500/20 bg-slate-500/5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground">To Do</p>
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                {breakdown.todo} <span className="text-[11px] text-muted-foreground font-normal">({breakdown.todoPct}%)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground">In Progress</p>
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                {breakdown.in_progress} <span className="text-[11px] text-muted-foreground font-normal">({breakdown.inProgressPct}%)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-purple-500/20 bg-purple-500/5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-400" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground">In Review</p>
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                {breakdown.review} <span className="text-[11px] text-muted-foreground font-normal">({breakdown.reviewPct}%)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground">Completed</p>
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                {breakdown.completed} <span className="text-[11px] text-muted-foreground font-normal">({breakdown.completedPct}%)</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Main Two-Column Content Grid: Workspaces & Deadlines / Manager ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols): Active Workspaces */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-border/70 bg-card/95 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  Active Project Workspaces
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Live development workspaces for {client.companyName}</p>
              </div>
              <Link
                href="/portal/projects"
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                All Projects <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-2 divide-y divide-border/40">
              {clientProjects.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No active projects currently listed for this account.
                </div>
              ) : (
                clientProjects.map((project) => {
                  const projTasks = clientTasks.filter((t) => t.project_id === project.id);
                  const projBreakdown = calculateTaskBreakdown(projTasks);

                  return (
                    <div key={project.id} className="py-4 first:pt-2 last:pb-0 space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <Link
                            href={`/portal/projects/${project.id}`}
                            className="font-bold text-foreground hover:text-sky-600 dark:hover:text-sky-400 transition-colors text-sm sm:text-base flex items-center gap-2"
                          >
                            {project.name}
                            <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-600 dark:text-sky-400 border border-sky-500/20 capitalize">
                              {project.status}
                            </span>
                          </Link>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {project.description || "Enterprise project implementation"}
                          </p>
                        </div>
                        <Link
                          href={`/portal/projects/${project.id}`}
                          className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-background/80 px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted active:scale-95 transition-all shrink-0 self-start sm:self-auto"
                        >
                          Open Workspace <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>

                      {/* Progress Bar & Deliverables Mini Breakdown */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Progress: {project.progress || projBreakdown.completedPct}%
                          </span>
                          <span className="text-muted-foreground font-mono">
                            {projBreakdown.completed} / {projBreakdown.total} completed
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                          <div
                            style={{ width: `${project.progress || projBreakdown.completedPct}%` }}
                            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-500 transition-all duration-500"
                          />
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {project.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Start: {project.start_date}
                          </span>
                        )}
                        {project.end_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Target: {project.end_date}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Deadlines & Account Manager */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <div className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Upcoming Milestones
              </h2>
              <span className="text-xs text-muted-foreground">Next 5</span>
            </div>

            <div className="mt-2 divide-y divide-border/40">
              {upcomingDeadlines.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No upcoming deadlines pending!
                </div>
              ) : (
                upcomingDeadlines.map((task) => (
                  <Link
                    key={task.id}
                    href={`/portal/tasks/${task.id}`}
                    className="group block py-3 first:pt-1 last:pb-0 transition-colors rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-2">
                        {task.title}
                      </p>
                      {getDeadlineBadge(task.due_date)}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className={`inline-block rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase ${STATUS_CONFIG[task.status].bg} ${STATUS_CONFIG[task.status].color}`}>
                        {STATUS_CONFIG[task.status].label}
                      </span>
                      {task.due_date && <span>Due {task.due_date}</span>}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Assigned Account Manager VIP Card */}
          <div className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2 pb-3 border-b border-border/60">
              <UserCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              Dedicated Account Executive
            </h2>

            <div className="mt-4 space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-teal-500 font-bold text-white shadow-sm text-sm">
                  {client.assignedManagerName.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{client.assignedManagerName}</p>
                  <p className="text-xs text-muted-foreground">Senior Account Manager</p>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2 text-xs">
                <a
                  href={`mailto:${client.assignedManagerEmail}`}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                  <span className="truncate">{client.assignedManagerEmail}</span>
                </a>
                {client.assignedManagerPhone && (
                  <a
                    href={`tel:${client.assignedManagerPhone}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                    <span>{client.assignedManagerPhone}</span>
                  </a>
                )}
              </div>

              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-[11px] text-muted-foreground leading-relaxed">
                💬 Need modifications or urgent reviews? Responses are guaranteed within 2 business hours under your enterprise SLA.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
