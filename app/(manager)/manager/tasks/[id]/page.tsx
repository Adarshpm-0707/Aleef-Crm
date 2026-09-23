/**
 * app/(manager)/manager/tasks/[id]/page.tsx
 *
 * Scoped Task Details View for Managers:
 * - Edit task details and status transitions (Review, Approve, Reopen)
 * - Assign/reassign to team members
 * - Comments discussion thread (taskCommentsApi)
 * - Attachments list and upload (taskAttachmentsApi)
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  tasksApi,
  taskCommentsApi,
  taskAttachmentsApi,
  employeesApi,
  type Task,
  type TaskComment,
  type TaskAttachment,
  type Employee,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/api";
import {
  useCurrentManager,
  filterEmployeesForManager,
} from "@/lib/permissions/manager";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  MessageSquare,
  Paperclip,
  Calendar,
  ArrowLeft,
  Edit2,
  Send,
  UploadCloud,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<TaskStatus, { label: string; badge: string }> = {
  todo: { label: "To Do", badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
  in_progress: { label: "In Progress", badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  review: { label: "In Review", badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  completed: { label: "Completed", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; badge: string }> = {
  low: { label: "Low", badge: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
  medium: { label: "Medium", badge: "bg-sky-500/10 text-sky-500 border-sky-500/20" },
  high: { label: "High", badge: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  urgent: { label: "Urgent", badge: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
};

export default function ManagerTaskDetailPage() {
  const params = useParams();
  const taskId = params?.id as string;
  const { manager } = useCurrentManager();

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [teamEmployees, setTeamEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // New comment input
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Attachment upload simulation
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFileName, setUploadFileName] = useState("");

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Task>>({});

  // Escape key close listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editOpen) setEditOpen(false);
        if (uploadOpen) setUploadOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editOpen, uploadOpen]);

  const loadData = useCallback(async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      const [t, cList, aList, eList] = await Promise.all([
        tasksApi.getById(taskId),
        taskCommentsApi.getByTaskId(taskId),
        taskAttachmentsApi.getByTaskId(taskId),
        employeesApi.getAll(),
      ]);
      setTask(t);
      setComments(cList);
      setAttachments(aList);
      setTeamEmployees(eList);
    } catch {
      toast.error("Failed to load task details");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadData();
  }, [loadData, manager.userId]);

  const scopedTeam = useMemo(
    () => filterEmployeesForManager(teamEmployees, manager),
    [teamEmployees, manager]
  );

  const handleStatusTransition = async (newStatus: TaskStatus) => {
    if (!task) return;
    try {
      await tasksApi.updateStatus(task.id, newStatus);
      toast.success(`Task moved to ${STATUS_CONFIG[newStatus].label}`);
      // Also log activity comment automatically
      await taskCommentsApi.create({
        taskId: task.id,
        userId: manager.userId,
        content: `Status updated to ${STATUS_CONFIG[newStatus].label} by ${manager.fullName}.`,
      });
      loadData();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      await taskCommentsApi.create({
        taskId: task.id,
        userId: manager.userId,
        content: newComment.trim(),
      });
      setNewComment("");
      toast.success("Comment posted");
      loadData();
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUploadAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !uploadFileName.trim()) return;
    try {
      await taskAttachmentsApi.create({
        taskId: task.id,
        fileName: uploadFileName.trim(),
        fileUrl: "#",
        fileSize: "2.4 MB",
        uploadedBy: manager.userId,
      });
      toast.success("Attachment added");
      setUploadOpen(false);
      setUploadFileName("");
      loadData();
    } catch {
      toast.error("Failed to attach file");
    }
  };

  const handleEditOpen = () => {
    if (!task) return;
    setEditForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      due_date: task.due_date,
      assignee_id: task.assignee_id,
    });
    setEditOpen(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    try {
      await tasksApi.update(task.id, editForm);
      toast.success("Task updated successfully");
      setEditOpen(false);
      loadData();
    } catch {
      toast.error("Failed to save changes");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in" role="status" aria-busy="true">
        <span className="sr-only">Loading task details & discussions...</span>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-6">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="py-12 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 opacity-60" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-bold text-foreground">Task not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">The requested task ID does not exist.</p>
        <Link
          href="/manager/tasks"
          className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-glow-amber hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={task.title}
        description={`Created in project "${task.project?.name || "Operations"}" for client ${task.client?.company_name || "Internal"}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/manager/dashboard" },
          { label: "Tasks", href: "/manager/tasks" },
          { label: task.title },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleEditOpen}
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors"
            >
              <Edit2 className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <span>Edit Details</span>
            </button>
            <Link
              href="/manager/kanban"
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white shadow-glow-amber hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors"
            >
              <span>Kanban Board</span>
            </Link>
          </div>
        }
      />

      {/* Task Summary & Status Transition Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              STATUS_CONFIG[task.status].badge
            }`}
          >
            {STATUS_CONFIG[task.status].label}
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              PRIORITY_CONFIG[task.priority].badge
            }`}
          >
            Priority: {task.priority}
          </span>
          {task.due_date && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" /> Due: {task.due_date}
            </span>
          )}
        </div>

        {/* Status Transition Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {task.status !== "in_progress" && task.status !== "completed" && (
            <button
              type="button"
              onClick={() => handleStatusTransition("in_progress")}
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-500 hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              Move to In Progress
            </button>
          )}
          {task.status !== "review" && task.status !== "completed" && (
            <button
              type="button"
              onClick={() => handleStatusTransition("review")}
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              Submit for Review
            </button>
          )}
          {task.status === "review" && (
            <button
              type="button"
              onClick={() => handleStatusTransition("completed")}
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Approve & Sign-Off
            </button>
          )}
          {task.status === "completed" && (
            <button
              type="button"
              onClick={() => handleStatusTransition("in_progress")}
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              Re-open Task
            </button>
          )}
        </div>
      </div>

      {/* Main Content Layout: Details & Comments */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Description & Comments Thread */}
        <div className="space-y-6 lg:col-span-8">
          {/* Description Card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-3">
            <h3 className="text-base font-semibold text-foreground">Task Overview & Deliverables</h3>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line bg-muted/20 p-4 rounded-xl border border-border/40">
              {task.description || "No detailed instructions provided for this task."}
            </p>
          </div>

          {/* Comments & Discussion Thread */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-amber-500" aria-hidden="true" />
                <h3 className="text-base font-semibold text-foreground">
                  Team Discussion ({comments.length})
                </h3>
              </div>
              <span className="text-xs text-muted-foreground">Collaborative thread</span>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No comments yet. Start the conversation below.
                </p>
              ) : (
                comments.map((comment) => {
                  const author = comment.user?.full_name || "Team Member";
                  const isManager = comment.user_id === manager.userId;

                  return (
                    <div
                      key={comment.id}
                      className={`flex gap-3 rounded-xl p-4 transition-colors ${
                        isManager ? "bg-amber-500/5 border border-amber-500/20" : "bg-muted/40"
                      }`}
                    >
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted font-bold text-xs text-foreground">
                        {author.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{author}</span>
                            {isManager && (
                              <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-500">
                                Manager
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(comment.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Input Box */}
            <form onSubmit={handleAddComment} className="border-t border-border pt-4">
              <div className="space-y-2">
                <label htmlFor="task-comment-input" className="sr-only">Type a comment</label>
                <textarea
                  id="task-comment-input"
                  rows={3}
                  required
                  placeholder="Type your feedback, approval notes, or questions..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    Pressing Post sends update to the task assignee
                  </span>
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-glow-amber hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    <span>Post Comment</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Metadata & Attachments */}
        <div className="space-y-6 lg:col-span-4">
          {/* Metadata Card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Assignment & Client
            </h4>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Assignee</p>
                <div className="mt-1 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 font-bold text-xs text-amber-500">
                    {task.assignee?.full_name?.slice(0, 2).toUpperCase() || "UN"}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {task.assignee?.full_name || "Unassigned"}
                    </p>
                    <p className="text-xs text-muted-foreground">{task.assignee?.email || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/60 pt-2.5">
                <p className="text-xs text-muted-foreground">Client Organization</p>
                <p className="font-semibold text-foreground mt-1">
                  {task.client?.company_name || "Internal Operational Task"}
                </p>
              </div>

              <div className="border-t border-border/60 pt-2.5">
                <p className="text-xs text-muted-foreground">Created Date</p>
                <p className="text-foreground mt-1 text-xs">
                  {new Date(task.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Attachments Card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-amber-500" aria-hidden="true" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Attachments ({attachments.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="inline-flex min-h-[44px] sm:min-h-0 items-center text-xs font-semibold text-amber-500 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
              >
                + Upload
              </button>
            </div>

            <div className="space-y-2">
              {attachments.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">No files attached yet.</p>
              ) : (
                attachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-amber-500 flex-shrink-0" aria-hidden="true" />
                      <span className="font-medium text-foreground truncate">{file.file_name}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground ml-2 flex-shrink-0">
                      {file.file_size || "1.5 MB"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Task Modal */}
      {editOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manager-edit-task-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 id="manager-edit-task-modal-title" className="text-lg font-bold text-foreground">Edit Task</h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                aria-label="Close edit task modal"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSave} className="mt-4 space-y-4">
              <div>
                <label htmlFor="edit-task-title-input" className="text-xs font-semibold text-foreground">Task Title *</label>
                <input
                  id="edit-task-title-input"
                  type="text"
                  required
                  value={editForm.title || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-task-assignee-select" className="text-xs font-semibold text-foreground">Reassign to Team Member</label>
                  <select
                    id="edit-task-assignee-select"
                    value={editForm.assignee_id || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, assignee_id: e.target.value }))}
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
                  <label htmlFor="edit-task-priority-select" className="text-xs font-semibold text-foreground">Priority</label>
                  <select
                    id="edit-task-priority-select"
                    value={editForm.priority || "medium"}
                    onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
                    className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="edit-task-duedate-input" className="text-xs font-semibold text-foreground">Due Date</label>
                <input
                  id="edit-task-duedate-input"
                  type="date"
                  value={editForm.due_date || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              <div>
                <label htmlFor="edit-task-desc-textarea" className="text-xs font-semibold text-foreground">Description & Instructions</label>
                <textarea
                  id="edit-task-desc-textarea"
                  rows={4}
                  value={editForm.description || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-glow-amber hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Attachment Modal */}
      {uploadOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manager-upload-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 id="manager-upload-modal-title" className="text-lg font-bold text-foreground">Attach File</h3>
              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                aria-label="Close attach file modal"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadAttachment} className="mt-4 space-y-4">
              <div>
                <label htmlFor="upload-filename-input" className="text-xs font-semibold text-foreground">File Name *</label>
                <input
                  id="upload-filename-input"
                  type="text"
                  required
                  placeholder="e.g. system_architecture_v2.pdf"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                <UploadCloud className="mx-auto h-8 w-8 text-amber-500 opacity-70 mb-2" aria-hidden="true" />
                <p>Drag and drop documents or click to browse files</p>
                <p className="text-[11px] text-muted-foreground mt-1">PDF, DOCX, XLSX, PNG up to 25MB</p>
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadOpen(false)}
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-glow-amber hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                >
                  Attach File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
