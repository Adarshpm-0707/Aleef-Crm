/**
 * app/(admin)/admin/projects/kanban/page.tsx
 *
 * Full Interactive Drag-and-Drop Kanban Board:
 * - Powered by @dnd-kit/core with columns (To Do, In Progress, In Review, Done)
 * - Admin permissions: drag, reorder, create, edit, assign, delete tasks
 * - Filters by Project, Assignee, and Priority
 * - Direct link to Task Detail page with full thread history
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  tasksApi,
  projectsApi,
  usersApi,
  type Task,
  type Project,
  type User,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { Board } from "@/components/kanban/Board";
import { type KanbanTask } from "@/components/kanban/TaskCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function KanbanBoardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");

  const loadData = useCallback(async () => {
    try {
      const [tList, pList, uList] = await Promise.all([
        tasksApi.getAll(),
        projectsApi.getAll(),
        usersApi.getAll(),
      ]);
      setTasks(tList);
      setProjects(pList);
      setUsers(uList);
    } catch {
      toast.error("Failed to load Kanban tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (projectFilter && t.project_id !== projectFilter) return false;
      if (assigneeFilter && t.assignee_id !== assigneeFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, projectFilter, assigneeFilter, priorityFilter]);

  // Convert Task[] to KanbanTask[]
  const kanbanTasks: KanbanTask[] = useMemo(() => {
    return filteredTasks.map((t) => {
      // map backend task status to columnId
      let colId = "todo";
      if (t.status === "in_progress") colId = "in-progress";
      else if (t.status === "review") colId = "review";
      else if (t.status === "completed") colId = "done";

      return {
        id: t.id,
        title: t.title,
        description: t.description || undefined,
        priority: t.priority,
        columnId: colId,
        dueDate: t.due_date,
        assignee: t.assignee ? { name: t.assignee.full_name } : undefined,
        tags: [t.project?.name || "General"].filter(Boolean),
      };
    });
  }, [filteredTasks]);

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-busy="true">
        <span className="sr-only">Loading Kanban board...</span>
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-h-[500px]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interactive Kanban Board"
        description="Drag cards across execution stages, assign personnel, manage priorities, and balance team bandwidth."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Projects", href: "/admin/projects" },
          { label: "Kanban Board" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/projects"
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All Projects
            </Link>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <label htmlFor="kb-proj-filter" className="text-xs font-medium text-muted-foreground">Project:</label>
          <select
            id="kb-proj-filter"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="min-h-[44px] sm:min-h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Projects ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <label htmlFor="kb-assignee-filter" className="text-xs font-medium text-muted-foreground">Assignee:</label>
          <select
            id="kb-assignee-filter"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="min-h-[44px] sm:min-h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Assignees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <label htmlFor="kb-priority-filter" className="text-xs font-medium text-muted-foreground">Priority:</label>
          <select
            id="kb-priority-filter"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="min-h-[44px] sm:min-h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {(projectFilter || assigneeFilter || priorityFilter) && (
          <button
            type="button"
            onClick={() => {
              setProjectFilter("");
              setAssigneeFilter("");
              setPriorityFilter("");
            }}
            className="min-h-[44px] sm:min-h-0 inline-flex items-center text-xs text-teal-600 hover:underline sm:ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Kanban Board Component */}
      <div className="relative rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm min-h-[600px] overflow-x-auto">
        <Board
          permission="admin"
          initialTasks={kanbanTasks}
        />
      </div>
    </div>
  );
}
