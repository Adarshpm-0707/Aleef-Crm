/**
 * app/(client)/portal/dashboard/page.tsx
 *
 * Client Portal Dashboard:
 *  - Overview of client's own projects and tasks
 *  - Status breakdown (todo, in_progress, review, completed)
 *  - Upcoming deadlines with urgency indicators
 *  - Direct access to assigned account manager
 *  - Strictly read-only: no admin/manager edit/create/delete controls rendered
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
import { PageHeader } from "@/components/shared/PageHeader";
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
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; border: string }> = {
  todo: {
    label: "To Do",
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
  },
  in_progress: {
    label: "In Progress",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  review: {
    label: "In Review",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  completed: {
    label: "Completed",
    color: "text-emerald-400",
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
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/20">
          <AlertCircle className="h-3 w-3" aria-hidden="true" /> Overdue
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
          <Clock className="h-3 w-3" aria-hidden="true" /> Due today
        </span>
      );
    }
    if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
          <Clock className="h-3 w-3" aria-hidden="true" /> In {diffDays} {diffDays === 1 ? "day" : "days"}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-400 border border-sky-500/20">
        <Calendar className="h-3 w-3" aria-hidden="true" /> In {diffDays} days
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-busy="true">
        <span className="sr-only">Loading client portal dashboard...</span>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`Welcome back, ${client.contactPerson.split(" ")[0]}`}
        description={`Overview of deliverables, milestones, and active workflows for ${client.companyName}`}
        breadcrumbs={[
          { label: "Client Portal", href: "/portal/dashboard" },
          { label: "Dashboard" },
        ]}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Projects */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:border-sky-500/30">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Projects
            </p>
            <div className="rounded-lg bg-sky-500/10 p-2 text-sky-400">
              <FolderKanban className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {clientProjects.length}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
            <span>Dedicated workspaces</span>
          </div>
        </div>

        {/* Tasks In Progress */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:border-amber-500/30">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              In Progress
            </p>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
              <Clock className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {breakdown.in_progress}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Currently being engineered</span>
          </div>
        </div>

        {/* In Review */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              In Review
            </p>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {breakdown.review}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Quality validation phase</span>
          </div>
        </div>

        {/* Completed Deliverables */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:border-emerald-500/30">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Completed
            </p>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {breakdown.completed}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-emerald-400 font-medium">{breakdown.completedPct}%</span>
            <span>of all items finished</span>
          </div>
        </div>
      </div>

      {/* Deliverables Status Breakdown Section */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Deliverables Status Breakdown</h2>
            <p className="text-xs text-muted-foreground">
              Live lifecycle distribution across {breakdown.total} total deliverables for {client.companyName}
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {breakdown.total} total tracked items
          </span>
        </div>

        {/* Multi-Segment Visual Progress Bar */}
        <div className="mt-4 h-3.5 w-full overflow-hidden rounded-full bg-muted/60 flex" role="progressbar" aria-valuenow={breakdown.completedPct} aria-valuemin={0} aria-valuemax={100}>
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
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex items-center gap-2 rounded-lg border border-slate-500/20 bg-slate-500/5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">To Do</p>
              <p className="text-sm font-semibold text-foreground">
                {breakdown.todo} <span className="text-xs text-muted-foreground font-normal">({breakdown.todoPct}%)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">In Progress</p>
              <p className="text-sm font-semibold text-foreground">
                {breakdown.in_progress} <span className="text-xs text-muted-foreground font-normal">({breakdown.inProgressPct}%)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-400" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">In Review</p>
              <p className="text-sm font-semibold text-foreground">
                {breakdown.review} <span className="text-xs text-muted-foreground font-normal">({breakdown.reviewPct}%)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-sm font-semibold text-foreground">
                {breakdown.completed} <span className="text-xs text-muted-foreground font-normal">({breakdown.completedPct}%)</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left (2 Cols): Active Projects */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h2 className="text-base font-semibold text-foreground">Active Workspaces & Projects</h2>
                <p className="text-xs text-muted-foreground">Projects currently running for your organization</p>
              </div>
              <Link
                href="/portal/projects"
                className="inline-flex min-h-[44px] sm:min-h-0 items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 focus-visible:outline-none focus-visible:underline transition-colors"
              >
                View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-4 divide-y divide-border">
              {clientProjects.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No active projects found for this client account.
                </div>
              ) : (
                clientProjects.map((project) => {
                  const projTasks = clientTasks.filter((t) => t.project_id === project.id);
                  const projBreakdown = calculateTaskBreakdown(projTasks);

                  return (
                    <div key={project.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <Link
                            href={`/portal/projects/${project.id}`}
                            className="font-semibold text-foreground hover:text-sky-400 focus-visible:outline-none focus-visible:underline transition-colors text-sm sm:text-base flex items-center gap-2"
                          >
                            {project.name}
                            <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-400 border border-sky-500/20 capitalize">
                              {project.status}
                            </span>
                          </Link>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {project.description || "Enterprise project implementation"}
                          </p>
                        </div>
                        <Link
                          href={`/portal/projects/${project.id}`}
                          className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 transition-colors shrink-0"
                        >
                          Workspace <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      </div>

                      {/* Progress Bar & Deliverables Mini breakdown */}
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Progress: {project.progress || projBreakdown.completedPct}%
                          </span>
                          <span className="text-muted-foreground">
                            {projBreakdown.completed} / {projBreakdown.total} tasks completed
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
                      <div className="mt-2.5 flex items-center gap-4 text-xs text-muted-foreground">
                        {project.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" aria-hidden="true" /> Start: {project.start_date}
                          </span>
                        )}
                        {project.end_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" aria-hidden="true" /> Target: {project.end_date}
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

        {/* Right (1 Col): Deadlines & Account Manager */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" aria-hidden="true" /> Upcoming Deadlines
              </h2>
              <span className="text-xs text-muted-foreground">Next 5</span>
            </div>

            <div className="mt-3 divide-y divide-border">
              {upcomingDeadlines.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No upcoming deadlines pending!
                </div>
              ) : (
                upcomingDeadlines.map((task) => (
                  <Link
                    key={task.id}
                    href={`/portal/tasks/${task.id}`}
                    className="group block min-h-[44px] py-3 first:pt-0 last:pb-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-foreground group-hover:text-sky-400 transition-colors line-clamp-2">
                        {task.title}
                      </p>
                      {getDeadlineBadge(task.due_date)}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
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

          {/* Assigned Account Manager Card */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 pb-3 border-b border-border">
              <UserCheck className="h-4 w-4 text-sky-400" aria-hidden="true" /> Dedicated Account Manager
            </h2>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-teal-500 font-bold text-white shadow-sm">
                  {client.assignedManagerName.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{client.assignedManagerName}</p>
                  <p className="text-xs text-muted-foreground">Senior Account Executive</p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/40 p-3 space-y-2 text-xs">
                <a
                  href={`mailto:${client.assignedManagerEmail}`}
                  className="flex min-h-[44px] sm:min-h-0 items-center gap-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                  <span className="truncate">{client.assignedManagerEmail}</span>
                </a>
                {client.assignedManagerPhone && (
                  <a
                    href={`tel:${client.assignedManagerPhone}`}
                    className="flex min-h-[44px] sm:min-h-0 items-center gap-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-teal-400" aria-hidden="true" />
                    <span>{client.assignedManagerPhone}</span>
                  </a>
                )}
              </div>

              <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
                💬 Need changes to scope or deliverables? Contact your Account Manager directly. Responses guaranteed within 2 business hours.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
