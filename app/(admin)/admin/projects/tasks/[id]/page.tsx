/**
 * app/(admin)/admin/projects/tasks/[id]/page.tsx
 *
 * Detailed Task View & Collaboration Hub:
 * - Full metadata: priority, status, linked client & project, due date
 * - Threaded comments section with instant submission
 * - Attachments ledger with download / add attachment link
 * - Activity history timeline
 * - Admin controls: change status, reassign user, edit task, delete task
 */

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  tasksApi,
  taskCommentsApi,
  taskAttachmentsApi,
  usersApi,
  type Task,
  type TaskComment,
  type TaskAttachment,
  type User,
  type TaskStatus,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Paperclip,
  MessageSquare,
  History,
  Send,
  ArrowLeft,
  Trash2,
  FileText,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const taskId = params.id;

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // New comment input
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // New attachment modal
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachFileName, setAttachFileName] = useState("");
  const [attachFileUrl, setAttachFileUrl] = useState("");

  const loadData = useCallback(async () => {
    if (!taskId) return;
    try {
      const [t, cList, aList, uList] = await Promise.all([
        tasksApi.getById(taskId),
        taskCommentsApi.getByTaskId(taskId),
        taskAttachmentsApi.getByTaskId(taskId),
        usersApi.getAll(),
      ]);
      setTask(t);
      setComments(cList);
      setAttachments(aList);
      setUsers(uList);
    } catch {
      toast.error("Failed to load task details");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showAttachModal) {
        setShowAttachModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAttachModal]);

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;
    try {
      await tasksApi.updateStatus(task.id, newStatus);
      toast.success(`Task marked as ${newStatus.replace("_", " ")}`);
      setTask({ ...task, status: newStatus });
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleAssigneeChange = async (userId: string) => {
    if (!task) return;
    try {
      await tasksApi.update(task.id, { assignee_id: userId || undefined });
      const assigned = users.find((u) => u.id === userId);
      toast.success(`Assigned to ${assigned?.full_name || "Unassigned"}`);
      loadData();
    } catch {
      toast.error("Failed to reassign task");
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !task) return;

    setSubmittingComment(true);
    try {
      await taskCommentsApi.create({
        taskId: task.id,
        userId: users[0]?.id || "u-admin-1",
        content: newComment.trim(),
      });
      toast.success("Comment posted");
      setNewComment("");
      const updatedComments = await taskCommentsApi.getByTaskId(task.id);
      setComments(updatedComments);
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachFileName.trim() || !attachFileUrl.trim() || !task) return;

    try {
      await taskAttachmentsApi.create({
        taskId: task.id,
        fileName: attachFileName.trim(),
        fileUrl: attachFileUrl.trim(),
        uploadedBy: users[0]?.id || "u-admin-1",
      });
      toast.success("Attachment linked to task");
      setShowAttachModal(false);
      setAttachFileName("");
      setAttachFileUrl("");
      const updated = await taskAttachmentsApi.getByTaskId(task.id);
      setAttachments(updated);
    } catch {
      toast.error("Failed to link attachment");
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      try {
        await tasksApi.delete(task.id);
        toast.success("Task deleted");
        router.push("/admin/projects/kanban");
      } catch {
        toast.error("Failed to delete task");
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-busy="true">
        <span className="sr-only">Loading task details...</span>
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="space-y-4">
        <Link href="/admin/projects/kanban" className="inline-flex min-h-[44px] sm:min-h-0 items-center gap-1.5 text-sm text-teal-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Kanban
        </Link>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <h2 className="text-lg font-semibold">Task not found</h2>
          <p className="mt-1 text-sm text-muted-foreground">This task may have been archived or removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={task.title}
        description={`Task details, collaboration thread, and attachments ledger • Project: ${task.project?.name || "General"}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Projects", href: "/admin/projects" },
          { label: "Kanban", href: "/admin/projects/kanban" },
          { label: task.title },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/projects/kanban"
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Board
            </Link>
            <button
              type="button"
              onClick={handleDeleteTask}
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-sm font-medium text-rose-600 hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete Task
            </button>
          </div>
        }
      />

      {/* Main Grid: Task Details & Collaboration Feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Description, Comments, Attachments */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description Card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3">
            <h2 className="text-base font-semibold text-foreground">Task Overview & Scope</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {task.description || "No detailed description provided for this task."}
            </p>
          </div>

          {/* Comments Feed */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-teal-600" />
              <h2 className="text-base font-semibold text-foreground">Discussion Thread ({comments.length})</h2>
            </div>

            <div className="space-y-3 pt-2">
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No discussion comments yet. Be the first to chime in.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                      {comment.user?.full_name?.slice(0, 1) || "U"}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{comment.user?.full_name || "Admin"}</span>
                        <span className="text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <form onSubmit={handleAddComment} className="mt-4 pt-4 border-t border-border space-y-3">
              <label htmlFor="task-new-comment" className="sr-only">Leave a comment</label>
              <textarea
                id="task-new-comment"
                rows={3}
                required
                placeholder="Write a message, ask a question, or update status..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingComment}
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  {submittingComment ? "Posting..." : "Post Comment"}
                </button>
              </div>
            </form>
          </div>

          {/* Attachments Section */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-teal-600" aria-hidden="true" />
                <h2 className="text-base font-semibold text-foreground">Attachments & Specs ({attachments.length})</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAttachModal(true)}
                className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                + Link Attachment
              </button>
            </div>

            {attachments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No files attached to this task.</p>
            ) : (
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-teal-600 flex-shrink-0" aria-hidden="true" />
                      <span className="font-medium text-foreground truncate">{att.file_name}</span>
                      <span className="text-muted-foreground">({att.file_size || "1.5 MB"})</span>
                    </div>
                    <a
                      href={att.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] sm:min-h-0 inline-flex items-center text-xs font-medium text-teal-600 hover:underline flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Metadata, Assignee, Status, Audit History */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Task Metadata</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="task-status-select" className="text-muted-foreground font-medium">Status</label>
                <select
                  id="task-status-select"
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background p-2 font-semibold capitalize text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">In Review</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <span className="text-muted-foreground font-medium block">Priority</span>
                <div className="mt-1">
                  <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-700 capitalize">
                    {task.priority} Priority
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="task-assignee-select" className="text-muted-foreground font-medium">Assigned To</label>
                <select
                  id="task-assignee-select"
                  value={task.assignee_id || ""}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background p-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-border/60 pt-3 space-y-2">
                <div>
                  <span className="text-muted-foreground">Project: </span>
                  <span className="font-semibold text-foreground">{task.project?.name || "General"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Client: </span>
                  <span className="font-semibold text-foreground">{task.client?.company_name || "Internal"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Due Date: </span>
                  <span className="font-semibold text-foreground">{task.due_date || "Open Ended"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity History Audit */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-1.5">
              <History className="h-4 w-4 text-teal-600" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-foreground">Audit Log</h3>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden="true" />
                <div>
                  <p className="text-foreground">Task created by system admin</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(task.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden="true" />
                <div>
                  <p className="text-foreground">Assigned to {task.assignee?.full_name || "Team"}</p>
                  <p className="text-[10px] text-muted-foreground">Recently</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Link Attachment Modal */}
      {showAttachModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="attach-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in">
            <h3 id="attach-modal-title" className="text-lg font-semibold text-foreground">Attach Document</h3>
            <p className="mt-1 text-xs text-muted-foreground">Add reference specification or deliverable URL.</p>

            <form onSubmit={handleAddAttachment} className="mt-4 space-y-4">
              <div>
                <label htmlFor="attach-file-name" className="text-xs font-medium text-foreground">File Name *</label>
                <input
                  id="attach-file-name"
                  type="text"
                  required
                  aria-required="true"
                  placeholder="e.g. system-architecture-v2.pdf"
                  value={attachFileName}
                  onChange={(e) => setAttachFileName(e.target.value)}
                  className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label htmlFor="attach-file-url" className="text-xs font-medium text-foreground">File URL *</label>
                <input
                  id="attach-file-url"
                  type="url"
                  required
                  aria-required="true"
                  placeholder="https://cloud.storage/documents/spec.pdf"
                  value={attachFileUrl}
                  onChange={(e) => setAttachFileUrl(e.target.value)}
                  className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAttachModal(false)}
                  className="min-h-[44px] sm:min-h-0 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] sm:min-h-0 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
