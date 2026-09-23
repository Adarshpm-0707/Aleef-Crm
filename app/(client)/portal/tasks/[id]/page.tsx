/**
 * app/(client)/portal/tasks/[id]/page.tsx
 *
 * Client Portal Task Detail View:
 *  - Detailed view of task metadata, description, and status progression
 *  - Attachments list (read-only)
 *  - Interactive Task Comments: client can read and submit comments only
 *  - Strict RBAC: NO edit/move/delete/reassign controls rendered in DOM
 */

"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  tasksApi,
  taskCommentsApi,
  taskAttachmentsApi,
  projectsApi,
  type Task,
  type TaskComment,
  type TaskAttachment,
  type Project,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/api";
import { useCurrentClient } from "@/lib/permissions/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Calendar,
  Send,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  User,
  FileText,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

const STAGES: { key: TaskStatus; label: string; desc: string }[] = [
  { key: "todo", label: "Queued", desc: "Scoped in roadmap" },
  { key: "in_progress", label: "In Progress", desc: "Under active development" },
  { key: "review", label: "In Review", desc: "Quality assurance & testing" },
  { key: "completed", label: "Completed", desc: "Delivered & verified" },
];

const STATUS_BADGES: Record<TaskStatus, { label: string; style: string }> = {
  todo: { label: "To Do", style: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  in_progress: { label: "In Progress", style: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  review: { label: "In Review", style: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  completed: { label: "Completed", style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
};

const PRIORITY_BADGES: Record<TaskPriority, { label: string; style: string }> = {
  low: { label: "Low", style: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  medium: { label: "Medium", style: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  high: { label: "High", style: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  urgent: { label: "Urgent", style: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

export default function ClientTaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const { client } = useCurrentClient();

  const [task, setTask] = useState<Task | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  // Comment input
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [t, cmts, atts] = await Promise.all([
        tasksApi.getById(taskId),
        taskCommentsApi.getByTaskId(taskId),
        taskAttachmentsApi.getByTaskId(taskId),
      ]);

      if (!t) {
        toast.error("Deliverable not found");
        router.push("/portal/dashboard");
        return;
      }

      // Check client ownership
      let belongsToClient = t.client_id === client.clientId;
      let proj: Project | null = null;
      if (t.project_id) {
        proj = await projectsApi.getById(t.project_id);
        if (proj && proj.client_id === client.clientId) {
          belongsToClient = true;
        }
      }

      if (!belongsToClient) {
        toast.error("Access restricted: This deliverable belongs to a different client");
        router.push("/portal/dashboard");
        return;
      }

      setTask(t);
      setProject(proj);
      setComments(cmts);
      setAttachments(atts);
    } catch {
      toast.error("Failed to load deliverable details");
    } finally {
      setLoading(false);
    }
  }, [taskId, client.clientId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle comment submit
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const created = await taskCommentsApi.create({
        taskId,
        userId: client.userId,
        content: newComment.trim(),
      });

      // Augment with author name for instant local rendering
      const augmented: TaskComment = {
        ...created,
        user: {
          id: client.userId,
          email: client.email,
          role: "client",
          full_name: client.contactPerson,
          avatar_url: "",
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };

      setComments((prev) => [...prev, augmented]);
      setNewComment("");
      toast.success("Comment posted successfully");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-busy="true">
        <span className="sr-only">Loading deliverable details...</span>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!task) return null;

  const currentStageIndex = STAGES.findIndex((s) => s.key === task.status);
  const statusInfo = STATUS_BADGES[task.status] || STATUS_BADGES.todo;
  const priorityInfo = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;

  return (
    <div className="space-y-6">
      {/* Top back navigation */}
      <div>
        <Link
          href={project ? `/portal/projects/${project.id}` : "/portal/dashboard"}
          className="inline-flex min-h-[44px] sm:min-h-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to {project ? project.name : "Dashboard"}
        </Link>
        <PageHeader
          title={task.title}
          description={`Track deliverable status and communicate with the implementation team`}
          breadcrumbs={[
            { label: "Client Portal", href: "/portal/dashboard" },
            ...(project ? [{ label: project.name, href: `/portal/projects/${project.id}` }] : []),
            { label: task.title },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${statusInfo.style}`}>
                {statusInfo.label}
              </span>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${priorityInfo.style}`}>
                Priority: {priorityInfo.label}
              </span>
            </div>
          }
        />
      </div>

      {/* Read-Only Status Progression Pipeline */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-sky-400" aria-hidden="true" /> Deliverable Progression Pipeline
          </h2>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden="true" /> Managed by Engineering Team
          </span>
        </div>

        {/* Pipeline Steps (Read-only visual timeline) */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2">
          {STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;

            return (
              <div
                key={stage.key}
                className={`relative rounded-xl border p-3.5 transition-all ${
                  isCurrent
                    ? "border-sky-500/50 bg-sky-500/10 shadow-sm"
                    : isCompleted
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border bg-muted/10 opacity-70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      isCurrent
                        ? "bg-sky-500 text-white"
                        : isCompleted
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? "✓" : idx + 1}
                  </span>
                  {isCurrent && (
                    <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-400">
                      Active
                    </span>
                  )}
                </div>
                <p className={`mt-2 text-xs font-bold ${isCurrent ? "text-sky-400" : "text-foreground"}`}>
                  {stage.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {stage.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Details + Comments */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left (1 Col): Metadata & Attachments */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border">
              Deliverable Specifications
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-muted-foreground">Project Workspace</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {project ? project.name : "Direct Deliverable"}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">Target Delivery Date</p>
                <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                  {task.due_date || "Continuous Roadmap"}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">Assigned Specialist</p>
                <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-teal-400" aria-hidden="true" />
                  {task.assignee?.full_name || "Technical Team"}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">Client Organization</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {client.companyName}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border/80 bg-muted/20 p-3 text-[11px] text-muted-foreground leading-relaxed">
              🔒 <span className="font-semibold text-foreground">Role Scope</span>: Deliverable timeline, status, and assignees are managed by your Aleef CRM project leads. You can submit questions and feedback below.
            </div>
          </div>

          {/* Attachments Section */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border flex items-center gap-2">
              <Paperclip className="h-3.5 w-3.5" aria-hidden="true" /> Deliverable Files ({attachments.length})
            </h3>

            {attachments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No files or specifications attached yet.
              </p>
            ) : (
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs bg-muted/20"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-sky-400 shrink-0" aria-hidden="true" />
                      <span className="truncate font-medium text-foreground">
                        {att.file_url.split("/").pop() || "Document"}
                      </span>
                    </div>
                    <a
                      href={att.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[44px] sm:min-h-0 items-center text-xs font-semibold text-sky-400 hover:text-sky-300 focus-visible:outline-none focus-visible:underline transition-colors"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right (2 Cols): Description & Interactive Comments */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description Card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-3">
            <h3 className="text-sm font-bold text-foreground">Scope & Requirements</h3>
            <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap rounded-lg bg-muted/20 p-4 border border-border">
              {task.description || "No specific detailed instructions provided for this deliverable."}
            </div>
          </div>

          {/* Comments & Discussion Thread */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-sky-400" aria-hidden="true" /> Collaboration & Comments
                </h3>
                <p className="text-xs text-muted-foreground">
                  Direct communication thread between your team and Aleef CRM engineers
                </p>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {comments.length} {comments.length === 1 ? "comment" : "comments"}
              </span>
            </div>

            {/* Comment List */}
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                  No comments yet. Start the conversation by posting a question or feedback below.
                </div>
              ) : (
                comments.map((comment) => {
                  const author = comment.user;
                  const isClient = author?.role === "client" || comment.user_id === client.userId;
                  const roleBadge = isClient ? "Client" : author?.role === "admin" ? "Admin" : "Engineer / Lead";

                  return (
                    <div
                      key={comment.id}
                      className={`flex gap-3 rounded-xl border p-4 transition-all ${
                        isClient
                          ? "border-sky-500/20 bg-sky-500/5"
                          : "border-border bg-muted/30"
                      }`}
                    >
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isClient
                            ? "bg-sky-500 text-white"
                            : "bg-muted-foreground/30 text-foreground"
                        }`}
                      >
                        {(author?.full_name || "User").charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground">
                              {author?.full_name || "Team Member"}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.2 text-[10px] font-semibold ${
                                isClient
                                  ? "bg-sky-500/20 text-sky-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {roleBadge}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Post Comment Form (Add Comments Only) */}
            <form onSubmit={handlePostComment} className="pt-3 border-t border-border space-y-3">
              <label htmlFor="client-comment-box" className="block text-xs font-semibold text-foreground">
                Leave a Comment or Question
              </label>
              <textarea
                id="client-comment-box"
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={`Type your question, review feedback, or note for the engineering team...`}
                className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 resize-none transition-colors"
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground">
                  Posting as <span className="font-semibold text-foreground">{client.contactPerson}</span> ({client.companyName})
                </p>
                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 transition-all shadow-sm"
                >
                  <Send className="h-3 w-3" aria-hidden="true" />
                  {submittingComment ? "Posting..." : "Post Comment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
