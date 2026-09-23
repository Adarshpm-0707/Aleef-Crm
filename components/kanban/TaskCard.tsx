/**
 * TaskCard — individual card shown inside a Kanban column.
 * Draggable when canEdit=true (admin/manager). Read-only for clients.
 */

"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

/* ─── Types ────────────────────────────────────────────────────────────────── */

export type Priority = "low" | "medium" | "high" | "urgent";

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  assignee?: { name: string; avatarUrl?: string };
  dueDate?: string;
  tags?: string[];
  columnId: string;
}

export interface TaskCardProps {
  task: KanbanTask;
  canEdit: boolean;
  onClick?: (task: KanbanTask) => void;
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

const PRIORITY_STYLES: Record<Priority, string> = {
  low:    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  high:   "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  urgent: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

const PRIORITY_DOT: Record<Priority, string> = {
  low:    "bg-emerald-500",
  medium: "bg-amber-500",
  high:   "bg-orange-500",
  urgent: "bg-rose-500",
};

function Avatar({ name, url }: { name: string; url?: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return url ? (
    <img src={url} alt={name} title={name} className="h-6 w-6 rounded-full object-cover ring-2 ring-background" />
  ) : (
    <span
      title={name}
      className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-500/20 text-[10px] font-bold text-teal-600 ring-2 ring-background"
    >
      {initials}
    </span>
  );
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export function TaskCard({ task, canEdit, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !canEdit });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() ? true : false;

  const dndProps = canEdit ? { ...attributes, ...listeners } : {};
  const { role: dndRole, tabIndex: dndTabIndex, ...restDndProps } = dndProps as {
    role?: string;
    tabIndex?: number;
    [key: string]: unknown;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role={canEdit ? (dndRole || "button") : "article"}
      aria-label={`Task: ${task.title}`}
      aria-grabbed={isDragging}
      tabIndex={dndTabIndex ?? 0}
      onClick={() => onClick?.(task)}
      onKeyDown={(e) => { if (e.key === "Enter") onClick?.(task); }}
      {...restDndProps}
      className={cn(
        "group relative rounded-xl border border-border bg-card p-3.5 shadow-card transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        canEdit && "cursor-grab active:cursor-grabbing",
        isDragging
          ? "opacity-50 shadow-lg scale-105 rotate-1"
          : "hover:shadow-card-hover hover:-translate-y-0.5",
        !canEdit && "cursor-pointer",
      )}
    >
      {/* Priority badge */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            PRIORITY_STYLES[task.priority],
          )}
        >
          <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[task.priority])} />
          {task.priority}
        </span>

        {/* Drag handle indicator (visible on hover when canEdit) */}
        {canEdit && (
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4 flex-shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <path fillRule="evenodd" d="M3 9a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 9zm0 6a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 15z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* Title */}
      <p className="mb-1 text-sm font-semibold leading-snug text-foreground line-clamp-2">
        {task.title}
      </p>

      {/* Description */}
      {task.description && (
        <p className="mb-3 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: assignee + due date */}
      <div className="flex items-center justify-between gap-2 pt-1">
        {task.assignee ? (
          <Avatar name={task.assignee.name} url={task.assignee.avatarUrl} />
        ) : (
          <div className="h-6 w-6 rounded-full border-2 border-dashed border-border" aria-label="Unassigned" />
        )}

        {task.dueDate && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-medium",
              isOverdue ? "text-danger" : "text-muted-foreground",
            )}
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
              <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
            </svg>
            {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
    </div>
  );
}
