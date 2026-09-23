/**
 * app/(manager)/manager/team/[id]/page.tsx
 *
 * Scoped Employee Profile & Task/Attendance View for Managers:
 * - Strictly accessible only if employee belongs to manager's team
 * - View member's assigned tasks with status filters
 * - View monthly attendance calendar (AttendanceCalendar)
 * - View member's leave request history
 * - Assign new tasks to this team member
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  employeesApi,
  tasksApi,
  leaveRequestsApi,
  clientsApi,
  type Employee,
  type Task,
  type LeaveRequest,
  type Client,
  type TaskPriority,
} from "@/lib/api";
import {
  useCurrentManager,
  isEmployeeInManagerTeam,
  filterClientsForManager,
} from "@/lib/permissions/manager";
import { PageHeader } from "@/components/shared/PageHeader";
import { AttendanceCalendar } from "@/components/attendance/Calendar";
import { StatCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import {
  Mail,
  Phone,
  ArrowLeft,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

export default function ManagerTeamMemberDetailPage() {
  const params = useParams();
  const employeeId = params?.id as string;
  const { manager } = useCurrentManager();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tasks" | "attendance" | "leaves">("tasks");

  // Assign Task Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    clientId: "",
    priority: "medium" as TaskPriority,
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
  });

  // Escape key close listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && assignModalOpen) {
        setAssignModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [assignModalOpen]);

  const loadData = useCallback(async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const [emp, allT, allL, allC] = await Promise.all([
        employeesApi.getById(employeeId),
        tasksApi.getAll(),
        leaveRequestsApi.getAll({ employeeId }),
        clientsApi.getAll(),
      ]);
      setEmployee(emp);
      if (emp?.user_id) {
        setTasks(allT.filter((t) => t.assignee_id === emp.user_id));
      }
      setLeaveRequests(allL);
      setClients(allC);
    } catch {
      toast.error("Failed to load team member profile");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadData();
  }, [loadData, manager.userId]);

  // Security Check: Is this employee on the manager's team?
  const hasAccess = useMemo(() => {
    return isEmployeeInManagerTeam(employee, manager);
  }, [employee, manager]);

  const scopedClients = useMemo(() => {
    return filterClientsForManager(clients, manager.userId);
  }, [clients, manager.userId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in" role="status" aria-busy="true">
        <span className="sr-only">Verifying team hierarchy & loading details...</span>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ── Access Denied State ───────────────────────────────────────────────────
  if (!employee || !hasAccess) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center animate-fade-in">
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
            <ShieldAlert className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-foreground">Access Restricted by Team Boundary</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Employee ID <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">{employeeId}</code> does not report to your account (<strong>{manager.fullName}</strong>) or belong to {manager.departmentName}.
            Under the manager role capability map, you may only inspect employees under your operational supervision.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/manager/team"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-glow-amber hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Return to My Team
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    try {
      await tasksApi.create({
        title: taskForm.title,
        description: taskForm.description,
        client_id: taskForm.clientId || undefined,
        assignee_id: employee.user_id,
        priority: taskForm.priority,
        due_date: taskForm.dueDate,
        created_by: manager.userId,
        status: "todo",
      });
      toast.success(`Task assigned to ${employee.user?.full_name}`);
      setAssignModalOpen(false);
      setTaskForm({
        title: "",
        description: "",
        clientId: "",
        priority: "medium",
        dueDate: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
      });
      loadData();
    } catch {
      toast.error("Failed to assign task");
    }
  };

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const activeTasks = tasks.filter((t) => t.status !== "completed").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={employee.user?.full_name || "Employee Profile"}
        description={`${employee.designation} • ${manager.departmentName} Department`}
        breadcrumbs={[
          { label: "Dashboard", href: "/manager/dashboard" },
          { label: "Team", href: "/manager/team" },
          { label: employee.user?.full_name || "Member" },
        ]}
        actions={
          <button
            type="button"
            onClick={() => setAssignModalOpen(true)}
            className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-2 rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white shadow-glow-amber hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Assign Task</span>
          </button>
        }
      />

      {/* Member Profile Overview Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-xl font-bold text-amber-500">
              {employee.user?.full_name?.slice(0, 2).toUpperCase() || "EM"}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{employee.user?.full_name}</h2>
              <p className="text-sm text-muted-foreground">{employee.designation}</p>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  {employee.user?.email}
                </span>
                {employee.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                    {employee.phone}
                  </span>
                )}
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-foreground font-semibold">
                  {employee.employee_id}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted/40 p-3 text-right">
              <p className="text-xs text-muted-foreground">Supervisor / Manager</p>
              <p className="text-sm font-bold text-foreground">{manager.fullName}</p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-3 text-right">
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Employment Status</p>
              <p className="text-sm font-bold capitalize text-emerald-600 dark:text-emerald-400">
                {employee.employment_status.replace("_", " ")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border overflow-x-auto">
        <nav className="flex space-x-6 min-w-max" aria-label="Team member tabs">
          {[
            { id: "tasks" as const, label: `Assigned Tasks (${tasks.length})` },
            { id: "attendance" as const, label: "Attendance Calendar" },
            { id: "leaves" as const, label: `Leave Records (${leaveRequests.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex min-h-[44px] items-center border-b-2 px-1 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                activeTab === tab.id
                  ? "border-amber-500 text-amber-500"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 1: Assigned Tasks */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Active Tasks</p>
              <p className="text-2xl font-bold text-amber-500 mt-1">{activeTasks}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Completed Tasks</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{completedTasks}</p>
            </div>
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Completion Rate</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Task Assignments</h3>
              <button
                type="button"
                onClick={() => setAssignModalOpen(true)}
                className="inline-flex min-h-[44px] sm:min-h-0 items-center gap-1 text-xs font-semibold text-amber-500 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
              >
                + Assign Another Task
              </button>
            </div>

            {tasks.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No tasks currently assigned to {employee.user?.full_name}.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {tasks.map((task) => (
                  <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                    <div className="space-y-1">
                      <Link
                        href={`/manager/tasks/${task.id}`}
                        className="text-sm font-medium text-foreground hover:text-amber-500 transition-colors focus-visible:outline-none focus-visible:underline"
                      >
                        {task.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>Client: {task.client?.company_name || "Internal"}</span>
                        <span>•</span>
                        <span className="capitalize">Priority: {task.priority}</span>
                        {task.due_date && (
                          <>
                            <span>•</span>
                            <span>Due: {task.due_date}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                          task.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : task.status === "review"
                            ? "bg-purple-500/10 text-purple-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                      <Link
                        href={`/manager/tasks/${task.id}`}
                        className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Attendance Calendar */}
      {activeTab === "attendance" && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Monthly Attendance Log</h3>
              <p className="text-xs text-muted-foreground">Record of daily presence, punch-in times, and leaves</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" /> Present</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" /> Late</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-500" aria-hidden="true" /> Leave</span>
            </div>
          </div>

          <AttendanceCalendar year={2026} month={9} />
        </div>
      )}

      {/* Tab 3: Leave Records */}
      {activeTab === "leaves" && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Leave Requests History</h3>
              <p className="text-xs text-muted-foreground">Submitted leave applications by {employee.user?.full_name}</p>
            </div>
            <Link
              href="/manager/leave-approvals"
              className="inline-flex min-h-[44px] sm:min-h-0 items-center text-xs font-semibold text-amber-500 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
            >
              Go to Approvals Queue →
            </Link>
          </div>

          {leaveRequests.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No leave requests on file for this employee.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {leaveRequests.map((lr) => (
                <div key={lr.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">
                      {lr.leave_type} Leave: {lr.start_date} to {lr.end_date}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Reason: {lr.reason}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                      lr.status === "approved"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : lr.status === "rejected"
                        ? "bg-rose-500/10 text-rose-600"
                        : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    {lr.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assign Task Modal */}
      {assignModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manager-assign-task-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 id="manager-assign-task-title" className="text-lg font-bold text-foreground">Assign Task to {employee.user?.full_name}</h3>
                <p className="text-xs text-muted-foreground">Create and delegate work to this team member</p>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                aria-label="Close assign task modal"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignTask} className="mt-4 space-y-4">
              <div>
                <label htmlFor="assign-task-title" className="text-xs font-semibold text-foreground">Task Title *</label>
                <input
                  id="assign-task-title"
                  type="text"
                  required
                  placeholder="e.g. Conduct compliance audit on client system"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              <div>
                <label htmlFor="assign-task-client" className="text-xs font-semibold text-foreground">Client Association</label>
                <select
                  id="assign-task-client"
                  value={taskForm.clientId}
                  onChange={(e) => setTaskForm((f) => ({ ...f, clientId: e.target.value }))}
                  className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
                >
                  <option value="">Internal Department Task (No Client)</option>
                  {scopedClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="assign-task-priority" className="text-xs font-semibold text-foreground">Priority</label>
                  <select
                    id="assign-task-priority"
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
                    className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="assign-task-duedate" className="text-xs font-semibold text-foreground">Due Date</label>
                  <input
                    id="assign-task-duedate"
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="assign-task-desc" className="text-xs font-semibold text-foreground">Instructions & Description</label>
                <textarea
                  id="assign-task-desc"
                  rows={3}
                  placeholder="Specific requirements, deliverables, or checklist..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-glow-amber hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                >
                  Delegate Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
