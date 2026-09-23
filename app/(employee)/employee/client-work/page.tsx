/**
 * app/(employee)/employee/client-work/page.tsx
 *
 * Client Work Management — View, organize, and update client tasks and projects.
 */

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  Building,
  Search,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentEmployee } from "@/lib/permissions/employee";
import { tasksApi, clientsApi, type Task, type Client, type TaskStatus } from "@/lib/api";

export default function ClientWorkManagementPage() {
  const { employee } = useCurrentEmployee();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");

  // Selected task modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [empTasks, allClients] = await Promise.all([
          tasksApi.getAll({ assigneeId: employee.userId }),
          clientsApi.getAll(),
        ]);
        setTasks(empTasks);
        setClients(allClients);
      } catch (err) {
        console.error("Failed to load client work:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [employee.userId]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setUpdatingStatus(true);
    try {
      const updated = await tasksApi.update(taskId, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      if (selectedTask?.id === taskId) {
        setSelectedTask(updated);
      }
      toast.success(`Task moved to ${newStatus.replace("_", " ")}`);
    } catch {
      toast.error("Failed to update task status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.client?.company_name.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
    const matchClient = clientFilter === "all" || t.client_id === clientFilter;

    return matchSearch && matchStatus && matchPriority && matchClient;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "high":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "medium":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "in_progress":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "review":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Briefcase className="h-6 w-6 text-indigo-400" />
            Client Work Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Execute deliverables and track progress on projects assigned by client managers
          </p>
        </div>

        <Link
          href="/employee/work-upload"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all self-start sm:self-auto"
        >
          <UploadCloud className="h-4 w-4" />
          Upload Deliverable
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks, clients, or requirements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-background/50 pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">In Review</option>
              <option value="completed">Completed</option>
            </select>

            {/* Priority Dropdown */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Client Dropdown */}
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="all">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick status tabs summary */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50 text-xs">
          <span className="text-muted-foreground mr-1">Quick Filter:</span>
          {["all", "todo", "in_progress", "review", "completed"].map((st) => {
            const count = st === "all" ? tasks.length : tasks.filter((t) => t.status === st).length;
            const active = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-full px-2.5 py-0.5 font-medium transition-all ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {st.replace("_", " ")} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Tasks Table / Cards */}
      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-card">
          <p className="text-sm text-muted-foreground">Loading assigned client tasks...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No tasks match your criteria</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Try adjusting your search terms or status filters to view other assigned client tasks.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-indigo-500/40 transition-all cursor-pointer"
              onClick={() => setSelectedTask(task)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${getPriorityBadge(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${getStatusBadge(task.status)}`}>
                      {task.status.replace("_", " ")}
                    </span>
                    {task.client && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-foreground/80">
                        <Building className="h-3 w-3 text-indigo-400" />
                        {task.client.company_name}
                      </span>
                    )}
                    {task.project && (
                      <span className="text-xs text-muted-foreground">
                        • {task.project.name}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-foreground hover:text-indigo-400 transition-colors">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                  <div className="text-left sm:text-right text-xs">
                    <p className="text-muted-foreground">Deadline</p>
                    <p className="font-semibold text-foreground">{task.due_date || "No deadline"}</p>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                      className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">In Review</option>
                      <option value="completed">Completed</option>
                    </select>

                    <Link
                      href={`/employee/work-upload?taskId=${task.id}&clientId=${task.client_id || ""}`}
                      className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-1.5 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                      title="Upload work deliverable for this task"
                    >
                      <UploadCloud className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${getPriorityBadge(selectedTask.priority)}`}>
                    {selectedTask.priority}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${getStatusBadge(selectedTask.status)}`}>
                    {selectedTask.status.replace("_", " ")}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-foreground">{selectedTask.title}</h2>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Task Info Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-border bg-background/50 p-3 text-xs">
              <div>
                <p className="text-muted-foreground">Client</p>
                <p className="font-semibold text-foreground">{selectedTask.client?.company_name || "Internal"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Project</p>
                <p className="font-semibold text-foreground">{selectedTask.project?.name || "General Client Work"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Due Date</p>
                <p className="font-semibold text-foreground">{selectedTask.due_date || "Not specified"}</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Requirements & Scope</h4>
              <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-foreground/90 whitespace-pre-wrap">
                {selectedTask.description || "No detailed instructions provided."}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs font-medium text-muted-foreground">Update Status:</label>
                <select
                  value={selectedTask.status}
                  onChange={(e) => handleStatusChange(selectedTask.id, e.target.value as TaskStatus)}
                  disabled={updatingStatus}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:border-indigo-500 focus:outline-none"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Submit for Review</option>
                  <option value="completed">Mark Completed</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Link
                  href={`/employee/work-upload?taskId=${selectedTask.id}&clientId=${selectedTask.client_id || ""}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-all shadow-sm"
                >
                  <UploadCloud className="h-4 w-4" />
                  Upload Deliverable
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
