/**
 * app/(manager)/manager/kanban/page.tsx
 *
 * Scoped Drag-and-Drop Kanban Board for Managers:
 * - Columns: To Do, In Progress, In Review, Completed
 * - Filter by team member and client
 * - Create & assign task modal
 * - Move tasks across columns with persistent state update
 * - Direct link to task comments & attachments
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Table as TableIcon,
  MessageSquare,
  Calendar,
  Briefcase,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";

interface ColumnDef {
  id: TaskStatus;
  title: string;
  color: string;
  badge: string;
}

const COLUMNS: ColumnDef[] = [
  { id: "todo", title: "To Do", color: "border-slate-500/30 bg-slate-500/5", badge: "bg-slate-500/10 text-slate-500" },
  { id: "in_progress", title: "In Progress", color: "border-amber-500/30 bg-amber-500/5", badge: "bg-amber-500/10 text-amber-500" },
  { id: "review", title: "In Review", color: "border-purple-500/30 bg-purple-500/5", badge: "bg-purple-500/10 text-purple-500" },
  { id: "completed", title: "Completed", color: "border-emerald-500/30 bg-emerald-500/5", badge: "bg-emerald-500/10 text-emerald-500" },
];

const PRIORITY_BADGES: Record<TaskPriority, string> = {
  low: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  medium: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  high: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  urgent: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

// ── Draggable Task Card ───────────────────────────────────────────────────────

function KanbanCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:border-amber-500/40 hover:shadow-card-hover cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            PRIORITY_BADGES[task.priority]
          }`}
        >
          {task.priority}
        </span>
        {task.client && (
          <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground truncate max-w-[120px]">
            {task.client.company_name}
          </span>
        )}
      </div>

      <Link
        href={`/manager/tasks/${task.id}`}
        onClick={(e) => e.stopPropagation()}
        className="mt-2 block font-semibold text-sm text-foreground hover:text-amber-500 transition-colors focus-visible:outline-none focus-visible:underline"
      >
        {task.title}
      </Link>

      {task.description && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 font-bold text-[10px] text-amber-500">
            {task.assignee?.full_name?.slice(0, 2).toUpperCase() || "UN"}
          </div>
          <span className="text-[11px] truncate max-w-[90px]">{task.assignee?.full_name || "Unassigned"}</span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {task.comments_count !== undefined && task.comments_count > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" aria-hidden="true" />
              {task.comments_count}
            </span>
          )}
          {task.due_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" aria-hidden="true" />
              {task.due_date.slice(5)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Kanban Board ─────────────────────────────────────────────────────────

export default function ManagerKanbanPage() {
  const { manager } = useCurrentManager();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<string>("all");

  // Drag state
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Create Task Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    clientId: "",
    assigneeId: "",
    priority: "medium" as TaskPriority,
    status: "todo" as TaskStatus,
    dueDate: new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10),
  });

  // Escape key close listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && createModalOpen) {
        setCreateModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createModalOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

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
      toast.error("Failed to load Kanban tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, manager.userId]);

  // Scoped Data
  const scopedClients = useMemo(() => {
    return filterClientsForManager(allClients, manager.userId);
  }, [allClients, manager.userId]);
  const clientIds = useMemo(() => scopedClients.map((c) => c.id), [scopedClients]);

  const scopedTeam = useMemo(() => {
    return filterEmployeesForManager(allEmployees, manager);
  }, [allEmployees, manager]);
  const teamUserIds = useMemo(() => scopedTeam.map((e) => e.user_id), [scopedTeam]);

  const scopedTasks = useMemo(() => {
    return filterTasksForManager(allTasks, manager.userId, clientIds, teamUserIds);
  }, [allTasks, manager.userId, clientIds, teamUserIds]);

  // Filtered by UI Selectors
  const filteredTasks = useMemo(() => {
    return scopedTasks.filter((t) => {
      if (selectedAssignee !== "all" && t.assignee_id !== selectedAssignee) return false;
      if (selectedClient !== "all" && t.client_id !== selectedClient) return false;
      return true;
    });
  }, [scopedTasks, selectedAssignee, selectedClient]);

  // DnD Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const task = allTasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped onto a column or onto another card
    let targetStatus: TaskStatus | null = null;
    if (COLUMNS.some((c) => c.id === overId)) {
      targetStatus = overId as TaskStatus;
    } else {
      const overTask = allTasks.find((t) => t.id === overId);
      if (overTask) targetStatus = overTask.status;
    }

    if (targetStatus) {
      const currentTask = allTasks.find((t) => t.id === taskId);
      if (currentTask && currentTask.status !== targetStatus) {
        // Optimistic UI update
        setAllTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus! } : t))
        );
        try {
          await tasksApi.updateStatus(taskId, targetStatus);
          toast.success(`Task moved to ${targetStatus.replace("_", " ")}`);
        } catch {
          toast.error("Failed to update task status");
          loadData();
        }
      }
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) return;
    try {
      await tasksApi.create({
        title: createForm.title,
        description: createForm.description,
        client_id: createForm.clientId || undefined,
        assignee_id: createForm.assigneeId || undefined,
        priority: createForm.priority,
        status: createForm.status,
        due_date: createForm.dueDate,
        created_by: manager.userId,
      });
      toast.success("New task created and assigned");
      setCreateModalOpen(false);
      setCreateForm({
        title: "",
        description: "",
        clientId: "",
        assigneeId: "",
        priority: "medium",
        status: "todo",
        dueDate: new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10),
      });
      loadData();
    } catch {
      toast.error("Failed to create task");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in" role="status" aria-busy="true">
        <span className="sr-only">Loading Kanban board...</span>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col rounded-2xl border border-border bg-card p-4 min-h-[500px] space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Team Kanban Board"
        description={`Interactive task pipeline for ${manager.fullName}'s team and clients. Drag cards between stages to update status.`}
        breadcrumbs={[
          { label: "Dashboard", href: "/manager/dashboard" },
          { label: "Kanban" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/manager/tasks"
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <TableIcon className="h-4 w-4" aria-hidden="true" />
              <span>List View</span>
            </Link>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white shadow-glow-amber hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Assign Task</span>
            </button>
          </div>
        }
      />

      {/* Board Controls & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="filter-assignee" className="sr-only">Filter by team member</label>
            <UserIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <select
              id="filter-assignee"
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
            >
              <option value="all">All Team Members ({scopedTeam.length})</option>
              {scopedTeam.map((emp) => (
                <option key={emp.user_id} value={emp.user_id}>
                  {emp.user?.full_name} ({emp.designation})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="filter-client" className="sr-only">Filter by client</label>
            <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <select
              id="filter-client"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
            >
              <option value="all">All Assigned Clients ({scopedClients.length})</option>
              {scopedClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-muted-foreground font-medium">
          Showing <strong>{filteredTasks.length}</strong> tasks in active sprint
        </div>
      </div>

      {/* Kanban Board DnD Container */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                id={col.id}
                className={`flex flex-col rounded-2xl border ${col.color} p-4 min-h-[580px]`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-foreground">{col.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${col.badge}`}>
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateForm((f) => ({ ...f, status: col.id }));
                      setCreateModalOpen(true);
                    }}
                    title={`Add task to ${col.title}`}
                    aria-label={`Add task to ${col.title}`}
                    className="inline-flex min-h-[44px] min-w-[44px] sm:min-h-8 sm:min-w-8 items-center justify-center rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Sortable Tasks List */}
                <SortableContext
                  items={colTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="mt-3 flex-1 space-y-3">
                    {colTasks.length === 0 ? (
                      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground">
                        Drop tasks here
                      </div>
                    ) : (
                      colTasks.map((task) => <KanbanCard key={task.id} task={task} />)
                    )}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-72 rotate-2 shadow-2xl">
              <KanbanCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Create / Assign Task Modal */}
      {createModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manager-create-task-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 id="manager-create-task-title" className="text-lg font-bold text-foreground">Create & Assign Task</h3>
                <p className="text-xs text-muted-foreground">Delegate work to your team for assigned clients</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                aria-label="Close create task modal"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <div>
                <label htmlFor="create-task-title" className="text-xs font-semibold text-foreground">Task Title *</label>
                <input
                  id="create-task-title"
                  type="text"
                  required
                  placeholder="e.g. Conduct security test on patient records portal"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="create-task-assignee" className="text-xs font-semibold text-foreground">Assignee (Team Member)</label>
                  <select
                    id="create-task-assignee"
                    value={createForm.assigneeId}
                    onChange={(e) => setCreateForm((f) => ({ ...f, assigneeId: e.target.value }))}
                    className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {scopedTeam.map((emp) => (
                      <option key={emp.user_id} value={emp.user_id}>
                        {emp.user?.full_name} ({emp.designation})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="create-task-client" className="text-xs font-semibold text-foreground">Client Association</label>
                  <select
                    id="create-task-client"
                    value={createForm.clientId}
                    onChange={(e) => setCreateForm((f) => ({ ...f, clientId: e.target.value }))}
                    className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
                  >
                    <option value="">Internal Department Task</option>
                    {scopedClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="create-task-status" className="text-xs font-semibold text-foreground">Column / Status</label>
                  <select
                    id="create-task-status"
                    value={createForm.status}
                    onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}
                    className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="create-task-priority" className="text-xs font-semibold text-foreground">Priority</label>
                  <select
                    id="create-task-priority"
                    value={createForm.priority}
                    onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
                    className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="create-task-due-date" className="text-xs font-semibold text-foreground">Due Date</label>
                  <input
                    id="create-task-due-date"
                    type="date"
                    value={createForm.dueDate}
                    onChange={(e) => setCreateForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="create-task-desc" className="text-xs font-semibold text-foreground">Task Description & Instructions</label>
                <textarea
                  id="create-task-desc"
                  rows={3}
                  placeholder="Details, scope, checklist, deliverables..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-glow-amber hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                >
                  Create & Delegate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
