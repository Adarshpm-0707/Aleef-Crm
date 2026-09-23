/**
 * app/(admin)/admin/reports/tasks/page.tsx
 *
 * Task Velocity & Workload Distribution Report:
 * - Velocity metrics, overdue tasks rate, on-time delivery %
 * - Priority & Status distribution charts
 * - Filter by Project, Assignee, Status, Priority
 * - ExportButton (CSV, Excel, PDF)
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  tasksApi,
  projectsApi,
  usersApi,
  type Task,
  type Project,
  type User,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type ColumnDef } from "@/components/shared/DataTable";
import { ExportButton } from "@/components/shared/ExportButton";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { toast } from "sonner";

export default function TasksReportPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [projectFilter, setProjectFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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
      toast.error("Failed to load tasks report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (projectFilter && t.project_id !== projectFilter) return false;
      if (assigneeFilter && t.assignee_id !== assigneeFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      return true;
    });
  }, [tasks, projectFilter, assigneeFilter, priorityFilter, statusFilter]);

  const completedCount = filtered.filter((t) => t.status === "completed").length;
  const inProgressCount = filtered.filter((t) => t.status === "in_progress").length;
  const overdueCount = filtered.filter(
    (t) => t.status !== "completed" && t.due_date && t.due_date < new Date().toISOString().slice(0, 10)
  ).length;

  // Chart data: tasks by priority
  const chartData = useMemo(() => {
    const priorities = ["low", "medium", "high", "urgent"];
    return priorities.map((p) => ({
      priority: p.toUpperCase(),
      completed: filtered.filter((t) => t.priority === p && t.status === "completed").length,
      active: filtered.filter((t) => t.priority === p && t.status !== "completed").length,
    }));
  }, [filtered]);

  const exportColumns = [
    { key: "title", header: "Task Title" },
    { key: "project", header: "Project" },
    { key: "assignee", header: "Assignee" },
    { key: "priority", header: "Priority" },
    { key: "status", header: "Status" },
    { key: "due_date", header: "Due Date" },
  ];

  const exportData = useMemo(() => {
    return filtered.map((t) => ({
      title: t.title,
      project: t.project?.name || "General",
      assignee: t.assignee?.full_name || "Unassigned",
      priority: t.priority,
      status: t.status,
      due_date: t.due_date || "",
    }));
  }, [filtered]);

  const columns: ColumnDef<Task>[] = [
    {
      key: "title",
      header: "Task / Project",
      sortable: true,
      cell: (row) => (
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground text-sm">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.project?.name || "General Task"}</p>
        </div>
      ),
    },
    {
      key: "assignee",
      header: "Assignee",
      cell: (row) => <span className="text-xs text-foreground font-medium">{row.assignee?.full_name || "Unassigned"}</span>,
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      cell: (row) => (
        <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold capitalize text-amber-700">
          {row.priority}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (row) => (
        <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium capitalize">
          {row.status.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "due_date",
      header: "Due Date",
      sortable: true,
      cell: (row) => <span className="text-xs text-muted-foreground">{row.due_date || "Open Ended"}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks Throughput & Velocity Report"
        description="Delivery analytics, sprint progress, and task completion velocity across projects."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Reports", href: "/admin/reports/crm" },
          { label: "Tasks Report" },
        ]}
        actions={<ExportButton filename="tasks_velocity_report" columns={exportColumns} data={exportData} />}
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Total Tasks</span>
          <p className="mt-1 text-2xl font-bold text-foreground">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Completed</span>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{completedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">In Progress</span>
          <p className="mt-1 text-2xl font-bold text-sky-600">{inProgressCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Overdue</span>
          <p className="mt-1 text-2xl font-bold text-rose-600">{overdueCount}</p>
        </div>
      </div>

      {/* Filters Strip */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <label htmlFor="tasks-proj-filter" className="text-xs font-medium text-muted-foreground">Project:</label>
          <select
            id="tasks-proj-filter"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="min-h-[44px] sm:min-h-8 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <label htmlFor="tasks-assignee-filter" className="text-xs font-medium text-muted-foreground">Assignee:</label>
          <select
            id="tasks-assignee-filter"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="min-h-[44px] sm:min-h-8 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          <label htmlFor="tasks-priority-filter" className="text-xs font-medium text-muted-foreground">Priority:</label>
          <select
            id="tasks-priority-filter"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="min-h-[44px] sm:min-h-8 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <label htmlFor="tasks-status-filter" className="text-xs font-medium text-muted-foreground">Status:</label>
          <select
            id="tasks-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-[44px] sm:min-h-8 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm" aria-label="Task Throughput by Priority Chart">
        <h2 className="text-base font-semibold text-foreground mb-4">Task Throughput by Priority</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="priority" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar dataKey="active" name="Active / In Progress" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main DataTable with skeleton */}
      <DataTable columns={columns} data={filtered} loading={loading} emptyTitle="No tasks matching filter" />
    </div>
  );
}
