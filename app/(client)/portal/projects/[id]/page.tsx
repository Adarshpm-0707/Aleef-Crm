/**
 * app/(client)/portal/projects/[id]/page.tsx
 *
 * Client Portal Project Workspace:
 *  - Full deliverables workspace for a specific project
 *  - Overall progress bar with 4-stage breakdown (todo / in_progress / review / completed)
 *  - Dual responsive layout: desktop table + mobile stacked cards (< md)
 *  - Filtering by status and priority
 *  - Direct links to task details and commenting thread
 *  - Strictly read-only: no admin/manager controls (no create, edit, delete, or reassign)
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  projectsApi,
  tasksApi,
  type Project,
  type Task,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/api";
import {
  useCurrentClient,
  calculateTaskBreakdown,
} from "@/lib/permissions/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableSkeleton, Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  Layers,
  Search,
  MessageSquare,
  ArrowLeft,
  Eye,
  User,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_BADGES: Record<TaskStatus, { label: string; style: string }> = {
  todo: {
    label: "To Do",
    style: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
  in_progress: {
    label: "In Progress",
    style: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  review: {
    label: "In Review",
    style: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
  completed: {
    label: "Completed",
    style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
};

const PRIORITY_BADGES: Record<TaskPriority, { label: string; style: string }> = {
  low: { label: "Low", style: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  medium: { label: "Medium", style: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  high: { label: "High", style: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  urgent: { label: "Urgent", style: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

export default function ClientProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { client } = useCurrentClient();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [proj, taskList] = await Promise.all([
        projectsApi.getById(projectId),
        tasksApi.getAll({ projectId }),
      ]);

      if (!proj) {
        toast.error("Project workspace not found");
        router.push("/portal/projects");
        return;
      }

      // Security check: verify this project belongs to active client
      if (proj.client_id !== client.clientId) {
        toast.error("Access restricted: This project belongs to a different client");
        router.push("/portal/projects");
        return;
      }

      setProject(proj);
      setTasks(taskList);
    } catch {
      toast.error("Failed to load workspace deliverables");
    } finally {
      setLoading(false);
    }
  }, [projectId, client.clientId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const breakdown = useMemo(() => calculateTaskBreakdown(tasks), [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter]);

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-busy="true">
        <span className="sr-only">Loading project workspace...</span>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </div>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumbs */}
      <div>
        <Link
          href="/portal/projects"
          className="inline-flex min-h-[44px] sm:min-h-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to all projects
        </Link>
        <PageHeader
          title={project.name}
          description={project.description || "Active deliverables and milestones workspace"}
          breadcrumbs={[
            { label: "Client Portal", href: "/portal/dashboard" },
            { label: "Projects", href: "/portal/projects" },
            { label: project.name },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400 border border-sky-500/20 capitalize">
                Status: {project.status}
              </span>
            </div>
          }
        />
      </div>

      {/* Progress & Breakdown Overview Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-sky-400" aria-hidden="true" /> Deliverables Progress & Completion
            </h2>
            <p className="text-xs text-muted-foreground">
              Lifecycle status of all {breakdown.total} tasks and deliverables in this workspace
            </p>
          </div>
          <div className="text-sm font-semibold text-foreground">
            {project.progress || breakdown.completedPct}% Complete
          </div>
        </div>

        {/* The 4-Stage Multi-Segment Progress Bar */}
        <div className="space-y-2">
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted/60 flex" role="progressbar" aria-valuenow={project.progress || breakdown.completedPct} aria-valuemin={0} aria-valuemax={100}>
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

          {/* 4 Legend Pills */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 pt-1">
            <div className="flex items-center gap-2 rounded-lg border border-slate-500/20 bg-slate-500/5 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-slate-400" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">To Do:</span>
              <span className="text-xs font-bold text-foreground">
                {breakdown.todo} ({breakdown.todoPct}%)
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">In Progress:</span>
              <span className="text-xs font-bold text-foreground">
                {breakdown.in_progress} ({breakdown.inProgressPct}%)
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-purple-400" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">In Review:</span>
              <span className="text-xs font-bold text-foreground">
                {breakdown.review} ({breakdown.reviewPct}%)
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">Completed:</span>
              <span className="text-xs font-bold text-foreground">
                {breakdown.completed} ({breakdown.completedPct}%)
              </span>
            </div>
          </div>
        </div>

        {/* Timeline & Metadata Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border text-xs text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Target Start Date:</span>{" "}
            {project.start_date || "Not set"}
          </div>
          <div>
            <span className="font-medium text-foreground">Target Delivery Date:</span>{" "}
            {project.end_date || "Continuous"}
          </div>
          <div>
            <span className="font-medium text-foreground">Account Lead:</span>{" "}
            {client.assignedManagerName}
          </div>
        </div>
      </div>

      {/* Deliverables Workspace Table / Card Container */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-muted/20">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <label htmlFor="deliverables-search" className="sr-only">Search deliverables in this project</label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="deliverables-search"
              type="text"
              placeholder="Search deliverables in this project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <label htmlFor="deliv-status-select" className="sr-only">Filter by status</label>
            <select
              id="deliv-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">In Review</option>
              <option value="completed">Completed</option>
            </select>

            <label htmlFor="deliv-priority-select" className="sr-only">Filter by priority</label>
            <select
              id="deliv-priority-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Empty state */}
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No deliverables found matching your criteria.
          </div>
        ) : (
          <>
            {/* Mobile Stacked Card List (< md) */}
            <div className="p-4 space-y-3 md:hidden">
              {filteredTasks.map((task) => {
                const statusInfo = STATUS_BADGES[task.status] || STATUS_BADGES.todo;
                const priorityInfo = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;

                return (
                  <div
                    key={task.id}
                    className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/portal/tasks/${task.id}`}
                        className="font-semibold text-foreground hover:text-sky-400 focus-visible:outline-none focus-visible:underline text-sm line-clamp-2"
                      >
                        {task.title}
                      </Link>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border shrink-0 ${statusInfo.style}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border ${priorityInfo.style}`}>
                        {priorityInfo.label}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" aria-hidden="true" />
                        {task.assignee?.full_name || "Technical Team"}
                      </span>
                      {task.due_date && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {task.due_date}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                          {task.comments_count || 0}
                        </span>
                        {(task.attachments_count ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                            {task.attachments_count}
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/portal/tasks/${task.id}`}
                        className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1 rounded-lg bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-400 hover:bg-sky-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" /> View & Comment
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Deliverables Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                  <tr>
                    <th scope="col" className="px-4 py-3">Deliverable / Task</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Priority</th>
                    <th scope="col" className="px-4 py-3">Assigned Team</th>
                    <th scope="col" className="px-4 py-3">Due Date</th>
                    <th scope="col" className="px-4 py-3">Activity</th>
                    <th scope="col" className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTasks.map((task) => {
                    const statusInfo = STATUS_BADGES[task.status] || STATUS_BADGES.todo;
                    const priorityInfo = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;

                    return (
                      <tr key={task.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3.5 max-w-xs">
                          <Link
                            href={`/portal/tasks/${task.id}`}
                            className="font-semibold text-foreground hover:text-sky-400 focus-visible:outline-none focus-visible:underline transition-colors line-clamp-1"
                          >
                            {task.title}
                          </Link>
                          {task.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${statusInfo.style}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${priorityInfo.style}`}>
                            {priorityInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                            <span>{task.assignee?.full_name || "Technical Team"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground">
                          {task.due_date ? (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" aria-hidden="true" />
                              <span>{task.due_date}</span>
                            </div>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1" title="Comments">
                              <MessageSquare className="h-3 w-3" aria-hidden="true" />
                              {task.comments_count || 0}
                            </span>
                            {(task.attachments_count ?? 0) > 0 && (
                              <span className="flex items-center gap-1" title="Attachments">
                                <Paperclip className="h-3 w-3" aria-hidden="true" />
                                {task.attachments_count}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          <Link
                            href={`/portal/tasks/${task.id}`}
                            className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1 rounded-md bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-400 hover:bg-sky-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 transition-colors"
                          >
                            <Eye className="h-3 w-3" aria-hidden="true" /> View & Comment
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
