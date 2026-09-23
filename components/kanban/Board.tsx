/**
 * Board — the full Kanban board with DnD context.
 * Permission prop controls edit capability:
 *   - admin | manager → canEdit = true (drag, create, edit, delete)
 *   - client          → canEdit = false (view only)
 */

"use client";

import React, { useState, useCallback } from "react";
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
  type DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { Column, type KanbanColumn } from "./Column";
import { TaskCard, type KanbanTask } from "./TaskCard";
import { TaskModal } from "./TaskModal";

/* ─── Types ────────────────────────────────────────────────────────────────── */

export type BoardPermission = "admin" | "manager" | "client";

export interface BoardProps {
  permission: BoardPermission;
  initialColumns?: KanbanColumn[];
  initialTasks?: KanbanTask[];
  className?: string;
}

/* ─── Default seed data ─────────────────────────────────────────────────────── */

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: "todo",        title: "To Do",       color: "bg-slate-400"   },
  { id: "in-progress", title: "In Progress", color: "bg-amber-400"   },
  { id: "review",      title: "In Review",   color: "bg-sky-400"     },
  { id: "done",        title: "Done",        color: "bg-emerald-400" },
];

const DEFAULT_TASKS: KanbanTask[] = [
  { id: "t1", title: "Research client needs",     description: "Call with Farid at 3pm",         priority: "high",   columnId: "todo",        tags: ["research"], dueDate: "2026-09-15", assignee: { name: "Sara Ahmed" } },
  { id: "t2", title: "Design proposal deck",      description: "Use brand kit v2",                priority: "urgent", columnId: "in-progress", tags: ["design"],   dueDate: "2026-09-10", assignee: { name: "Omar Hassan" } },
  { id: "t3", title: "Implement auth module",     description: "Supabase SSR + RLS",              priority: "high",   columnId: "in-progress", tags: ["dev"],      dueDate: "2026-09-12" },
  { id: "t4", title: "Code review — dashboard",   description: "PR #41",                          priority: "medium", columnId: "review",      tags: ["review"] },
  { id: "t5", title: "Deploy to staging",         description: "",                                priority: "medium", columnId: "review",      tags: ["devops"],   dueDate: "2026-09-11" },
  { id: "t6", title: "Client onboarding email",   description: "Send welcome pack",               priority: "low",    columnId: "done",        tags: ["crm"] },
  { id: "t7", title: "Write test cases",          description: "Unit + integration for API",      priority: "low",    columnId: "todo",        tags: ["testing"] },
];

/* ─── Board Component ────────────────────────────────────────────────────────── */

export function Board({
  permission,
  initialColumns = DEFAULT_COLUMNS,
  initialTasks = DEFAULT_TASKS,
  className,
}: BoardProps) {
  const canEdit = permission === "admin" || permission === "manager";

  const [columns] = useState<KanbanColumn[]>(initialColumns);
  const [tasks, setTasks] = useState<KanbanTask[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [modalTask, setModalTask] = useState<KanbanTask | null | undefined>(undefined); // undefined = closed

  /* ── Sensors ── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /* ── DnD handlers ── */
  const onDragStart = useCallback(({ active }: DragStartEvent) => {
    const task = tasks.find((t) => t.id === active.id);
    if (task) setActiveTask(task);
  }, [tasks]);

  const onDragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Check if over a column
    const overColumn = columns.find((c) => c.id === overId);
    if (overColumn && activeTask.columnId !== overId) {
      setTasks((prev) =>
        prev.map((t) => t.id === activeId ? { ...t, columnId: overId } : t),
      );
      return;
    }

    // Over a task → move to its column
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && activeTask.columnId !== overTask.columnId) {
      setTasks((prev) =>
        prev.map((t) => t.id === activeId ? { ...t, columnId: overTask.columnId } : t),
      );
    }
  }, [tasks, columns]);

  const onDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    setTasks((prev) => {
      const activeIdx = prev.findIndex((t) => t.id === activeId);
      const overIdx = prev.findIndex((t) => t.id === overId);
      if (activeIdx === -1) return prev;
      // if over is a column, put at end
      if (overIdx === -1) return prev;
      return arrayMove(prev, activeIdx, overIdx);
    });
  }, []);

  /* ── Modal handlers ── */
  const openNewTask = (columnId: string) => {
    setModalTask({ id: crypto.randomUUID(), title: "", priority: "medium", columnId, tags: [] });
  };

  const openEditTask = (task: KanbanTask) => {
    setModalTask(task);
  };

  const closeModal = () => setModalTask(undefined);

  const saveTask = (task: KanbanTask) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === task.id);
      if (idx >= 0) return prev.map((t, i) => (i === idx ? task : t));
      return [...prev, task];
    });
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const colsList = columns.map((c) => ({ id: c.id, title: c.title }));

  return (
    <>
      <div
        role="region"
        aria-label="Kanban board"
        className={cn(
          "flex gap-5 overflow-x-auto pb-4",
          "scrollbar-thin",
          className,
        )}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.columnId === col.id);
            return (
              <Column
                key={col.id}
                column={col}
                tasks={colTasks}
                canEdit={canEdit}
                onTaskClick={openEditTask}
                onAddTask={canEdit ? openNewTask : undefined}
              />
            );
          })}

          {/* Drag overlay (floating card while dragging) */}
          <DragOverlay>
            {activeTask && (
              <div className="rotate-2 opacity-90">
                <TaskCard task={activeTask} canEdit={false} />
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* Add column button (admin only) */}
        {permission === "admin" && (
          <button
            type="button"
            aria-label="Add a new column"
            className={cn(
              "flex h-fit w-72 flex-shrink-0 items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3",
              "text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add column
          </button>
        )}
      </div>

      {/* Task modal */}
      {modalTask !== undefined && (
        <TaskModal
          open={true}
          onClose={closeModal}
          task={modalTask}
          columns={colsList}
          canEdit={canEdit}
          onSave={saveTask}
          onDelete={deleteTask}
        />
      )}
    </>
  );
}
