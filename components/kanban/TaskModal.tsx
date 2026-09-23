/**
 * TaskModal — create/edit a Kanban task.
 * Read-only mode for clients (canEdit=false).
 */

"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { KanbanTask, Priority } from "./TaskCard";

export interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  task?: KanbanTask | null;
  columns: { id: string; title: string }[];
  canEdit: boolean;
  onSave?: (task: KanbanTask) => void;
  onDelete?: (taskId: string) => void;
}

const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

function emptyTask(columnId: string): KanbanTask {
  return { id: crypto.randomUUID(), title: "", priority: "medium", columnId, tags: [] };
}

export function TaskModal({
  open,
  onClose,
  task,
  columns,
  canEdit,
  onSave,
  onDelete,
}: TaskModalProps) {
  const [form, setForm] = useState<KanbanTask>(task ?? emptyTask(columns[0]?.id ?? ""));
  const [tagInput, setTagInput] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  /* sync when task prop changes */
  useEffect(() => {
    setForm(task ?? emptyTask(columns[0]?.id ?? ""));
    setTagInput("");
  }, [task, columns]);

  /* trap focus */
  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable[0]?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const arr = Array.from(focusable);
        if (arr.length === 0) return;
        const first = arr[0];
        const last = arr[arr.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const update = (patch: Partial<KanbanTask>) => setForm((f) => ({ ...f, ...patch }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags?.includes(t)) update({ tags: [...(form.tags ?? []), t] });
    setTagInput("");
  };

  const removeTag = (tag: string) => update({ tags: form.tags?.filter((t) => t !== tag) });

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave?.(form);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/50 animate-fade-in"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={canEdit ? (task ? "Edit task" : "Create task") : "Task details"}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
          "rounded-2xl border border-border bg-card shadow-xl animate-scale-in",
          "max-h-[90vh] overflow-y-auto",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">
            {canEdit ? (task ? "Edit Task" : "New Task") : "Task Details"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="task-title" className="text-sm font-medium text-foreground">
              Title <span aria-hidden="true" className="text-danger">*</span>
            </label>
            {canEdit ? (
              <input
                id="task-title"
                type="text"
                value={form.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Task title…"
                className={cn(
                  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              />
            ) : (
              <p className="text-sm text-foreground">{form.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="task-desc" className="text-sm font-medium text-foreground">
              Description
            </label>
            {canEdit ? (
              <textarea
                id="task-desc"
                rows={3}
                value={form.description ?? ""}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="Add a description…"
                className={cn(
                  "w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{form.description || "—"}</p>
            )}
          </div>

          {/* Priority + Column row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="task-priority" className="text-sm font-medium text-foreground">Priority</label>
              {canEdit ? (
                <select
                  id="task-priority"
                  value={form.priority}
                  onChange={(e) => update({ priority: e.target.value as Priority })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm capitalize text-foreground">{form.priority}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="task-column" className="text-sm font-medium text-foreground">Column</label>
              {canEdit ? (
                <select
                  id="task-column"
                  value={form.columnId}
                  onChange={(e) => update({ columnId: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-foreground">{columns.find((c) => c.id === form.columnId)?.title ?? "—"}</p>
              )}
            </div>
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <label htmlFor="task-due" className="text-sm font-medium text-foreground">Due Date</label>
            {canEdit ? (
              <input
                id="task-due"
                type="date"
                value={form.dueDate ?? ""}
                onChange={(e) => update({ dueDate: e.target.value })}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            ) : (
              <p className="text-sm text-foreground">{form.dueDate || "—"}</p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {form.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                >
                  {tag}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove tag ${tag}`}
                      className="ml-0.5 rounded-full hover:text-danger focus-visible:outline-none"
                    >
                      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  )}
                </span>
              ))}
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <input
                  id="task-tag-input"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Add tag, press Enter"
                  className={cn(
                    "flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm",
                    "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          {canEdit && task ? (
            <button
              type="button"
              onClick={() => { onDelete?.(task.id); onClose(); }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Delete task
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {canEdit ? "Cancel" : "Close"}
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={handleSave}
                disabled={!form.title.trim()}
                className={cn(
                  "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all",
                  "hover:opacity-90 disabled:pointer-events-none disabled:opacity-50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {task ? "Save changes" : "Create task"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
