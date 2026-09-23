/**
 * app/(manager)/manager/tasks/page.tsx
 *
 * Scoped Tasks List View for Managers:
 * - Table view of all tasks scoped to manager's clients and team
 * - Filters by status, priority, assignee, client
 * - Switch to Kanban view toggle
 * - Assign new task modal
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  tasksApi,
  clientsApi,
  employeesApi,
  type Task,
  type Client,
  type Employee,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/api";
import {
  useCurrentManager,
  filterClientsForManager,
  filterEmployeesForManager,
  filterTasksForManager,
} from "@/lib/permissions/manager";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type ColumnDef } from "@/components/shared/DataTable";
import { FilterBar, type FilterBarFilters } from "@/components/shared/FilterBar";
import { ExportButton } from "@/components/shared/ExportButton";
import {
  Eye,
  Calendar,
  MessageSquare,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<TaskStatus, { label: string; style: string }> = {
  todo: { label: "To Do", style: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
  in_progress: { label: "In Progress", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  review: { label: "In Review", style: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  completed: { label: "Completed", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
};

const PRIORITY_LABELS: Record<TaskPriority, { label: string; style: string }> = {
  low: { label: "Low", style: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
  medium: { label: "Medium", style: "bg-sky-500/10 text-sky-500 border-sky-500/20" },
  high: { label: "High", style: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  urgent: { label: "Urgent", style: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
};

export default function ManagerTasksPage() {
  const { manager } = useCurrentManager();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterBarFilters>({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tList, cList, eList] = await Promise.all([
        tasksApi.getAll(),
        clientsApi.getAll(),
        employeesApi.getAll(),
      ]);
      setAllTasks(tList);
      setAllClients(cList);
      setAllEmployees(eList);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, manager.userId]);

  // Scoped Data
  const scopedClients = useMemo(
    () => filterClientsForManager(allClients, manager.userId),
    [allClients, manager.userId]
  );
  const clientIds = useMemo(() => scopedClients.map((c) => c.id), [scopedClients]);

  const scopedTeam = useMemo(
    () => filterEmployeesForManager(allEmployees, manager),
    [allEmployees, manager]
  );
  const teamUserIds = useMemo(() => scopedTeam.map((e) => e.user_id), [scopedTeam]);

  const scopedTasks = useMemo(
    () => filterTasksForManager(allTasks, manager.userId, clientIds, teamUserIds),
    [allTasks, manager.userId, clientIds, teamUserIds]
  );

  const filteredTasks = useMemo(() => {
    return scopedTasks.filter((t) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matches =
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.assignee?.full_name?.toLowerCase().includes(q) ||
          t.client?.company_name.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (filters.status && filters.status !== "all") {
        if (t.status !== filters.status) return false;
      }
      return true;
    });
  }, [scopedTasks, filters]);

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    try {
      await tasksApi.updateStatus(task.id, newStatus);
      toast.success(`Task status updated to ${STATUS_LABELS[newStatus]?.label || newStatus}`);
      loadData();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const columns: ColumnDef<Task>[] = [
    {
      key: "title",
      header: "Task Title",
      sortable: true,
      cell: (row) => (
        <div className="space-y-1">
          <Link
            href={`/manager/tasks/${row.id}`}
            className="font-semibold text-foreground hover:text-amber-500 transition-colors"
          >
            {row.title}
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {row.client && (
              <span className="flex items-center gap-1 font-medium text-foreground">
                <Briefcase className="h-3 w-3 text-muted-foreground" />
                {row.client.company_name}
              </span>
            )}
            {row.comments_count !== undefined && row.comments_count > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {row.comments_count}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "assignee",
      header: "Assignee",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10 font-bold text-xs text-amber-500">
            {row.assignee?.full_name?.slice(0, 2).toUpperCase() || "UN"}
          </div>
          <span className="text-xs text-foreground font-medium">
            {row.assignee?.full_name || "Unassigned"}
          </span>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      cell: (row) => (
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
            PRIORITY_LABELS[row.priority]?.style
          }`}
        >
          {row.priority}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (row) => (
        <select
          value={row.status}
          onChange={(e) => handleStatusChange(row, e.target.value as TaskStatus)}
          aria-label={`Status for ${row.title}`}
          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer ${
            STATUS_LABELS[row.status]?.style || "bg-muted text-foreground"
          }`}
        >
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="review">In Review</option>
          <option value="completed">Completed</option>
        </select>
      ),
    },
    {
      key: "due_date",
      header: "Due Date",
      sortable: true,
      cell: (row) => {
        const isOverdue =
          row.due_date && new Date(row.due_date).getTime() < Date.now() && row.status !== "completed";
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className={`h-3.5 w-3.5 ${isOverdue ? "text-rose-500" : "text-muted-foreground"}`} />
            <span className={isOverdue ? "font-bold text-rose-500" : "text-muted-foreground"}>
              {row.due_date || "No deadline"}
            </span>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/manager/tasks/${row.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Details</span>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Team Tasks & Deliverables"
        description={`Tabular view of active and completed work scoped to ${manager.fullName}'s team and clients.`}
        breadcrumbs={[
          { label: "Dashboard", href: "/manager/dashboard" },
          { label: "Tasks" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/manager/kanban"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 text-amber-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <span>Kanban Board</span>
            </Link>
            <ExportButton
              data={scopedTasks.map((t) => ({
                Title: t.title,
                Assignee: t.assignee?.full_name || "Unassigned",
                Client: t.client?.company_name || "Internal",
                Priority: t.priority,
                Status: t.status,
                DueDate: t.due_date || "",
              }))}
              filename={`tasks-${manager.fullName.toLowerCase().replace(/\s+/g, "-")}`}
              columns={[
                { header: "Title", key: "Title" },
                { header: "Assignee", key: "Assignee" },
                { header: "Client", key: "Client" },
                { header: "Priority", key: "Priority" },
                { header: "Status", key: "Status" },
                { header: "Due Date", key: "DueDate" },
              ]}
            />
          </div>
        }
      />

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        statusOptions={[
          { value: "todo", label: "To Do" },
          { value: "in_progress", label: "In Progress" },
          { value: "review", label: "In Review" },
          { value: "completed", label: "Completed" },
        ]}
      />

      {/* Tasks Data Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredTasks}
          rowKey="id"
          defaultPageSize={10}
          emptyTitle="No tasks found"
          emptyDescription="No tasks matched the active filters for your management scope."
        />
      )}
    </div>
  );
}
