/**
 * Column — a droppable Kanban column containing TaskCards.
 * Uses @dnd-kit/sortable for the task list within the column.
 */

"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { TaskCard, type KanbanTask } from "./TaskCard";

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string; // tailwind bg class for top bar
}

export interface ColumnProps {
  column: KanbanColumn;
  tasks: KanbanTask[];
  canEdit: boolean;
  onTaskClick?: (task: KanbanTask) => void;
  onAddTask?: (columnId: string) => void;
}

const DEFAULT_COLORS: Record<string, string> = {
  "todo":        "bg-slate-400",
  "in-progress": "bg-amber-400",
  "review":      "bg-sky-400",
  "done":        "bg-emerald-400",
};

export function Column({ column, tasks, canEdit, onTaskClick, onAddTask }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const colorClass =
    column.color ??
    DEFAULT_COLORS[column.id.toLowerCase()] ??
    "bg-teal-400";

  return (
    <div
      className={cn(
        "flex w-72 flex-shrink-0 flex-col rounded-2xl border border-border bg-muted/40 transition-colors duration-150",
        isOver && "ring-2 ring-primary/50 bg-primary/5",
      )}
      aria-label={`${column.title} column, ${tasks.length} tasks`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2.5 rounded-t-2xl px-4 py-3">
        <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-full", colorClass)} />
        <h3 className="flex-1 text-sm font-semibold text-foreground">{column.title}</h3>
        <span
          aria-label={`${tasks.length} tasks`}
          className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
        >
          {tasks.length}
        </span>
        {canEdit && onAddTask && (
          <button
            type="button"
            onClick={() => onAddTask(column.id)}
            aria-label={`Add task to ${column.title}`}
            className={cn(
              "rounded-lg p-1 text-muted-foreground transition-colors",
              "hover:bg-background hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        )}
      </div>

      {/* Task list */}
      <div
        ref={setNodeRef}
        className="flex-1 space-y-2.5 overflow-y-auto px-3 pb-3 pt-1"
        style={{ minHeight: 80 }}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              canEdit={canEdit}
              onClick={onTaskClick}
            />
          ))}
        </SortableContext>

        {/* Empty column placeholder */}
        {tasks.length === 0 && (
          <div
            aria-label="No tasks"
            className="flex h-20 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground"
          >
            {canEdit ? "Drop tasks here" : "No tasks"}
          </div>
        )}
      </div>
    </div>
  );
}
