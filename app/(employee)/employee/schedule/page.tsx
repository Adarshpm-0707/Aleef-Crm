/**
 * app/(employee)/employee/schedule/page.tsx
 *
 * Work Scheduling — Manage daily working shifts, client calls, focus time,
 * and project deadlines.
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Building,
  CheckCircle2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentEmployee } from "@/lib/permissions/employee";
import {
  workSchedulesApi,
  clientsApi,
  type WorkScheduleItem,
  type Client,
} from "@/lib/api";

export default function WorkSchedulingPage() {
  const { employee } = useCurrentEmployee();
  const [schedules, setSchedules] = useState<WorkScheduleItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // New item modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<WorkScheduleItem["type"]>("focus_time");
  const [newStartTime, setNewStartTime] = useState("10:00");
  const [newEndTime, setNewEndTime] = useState("11:30");
  const [newClientId, setNewClientId] = useState("");
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [empSchedules, allClients] = await Promise.all([
          workSchedulesApi.getAll({ employeeId: employee.employeeId }),
          clientsApi.getAll(),
        ]);
        setSchedules(empSchedules);
        setClients(allClients);
      } catch (err) {
        console.error("Failed to load schedule:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [employee.employeeId]);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Please enter a title for the schedule block");
      return;
    }

    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const startIso = `${todayStr}T${newStartTime}:00`;
      const endIso = `${todayStr}T${newEndTime}:00`;

      const created = await workSchedulesApi.create({
        employee_id: employee.employeeId,
        user_id: employee.userId,
        title: newTitle.trim(),
        type: newType,
        start_time: startIso,
        end_time: endIso,
        client_id: newClientId || undefined,
        notes: newNotes.trim() || undefined,
      });

      setSchedules((prev) => [...prev, created]);
      setIsModalOpen(false);
      setNewTitle("");
      setNewNotes("");
      setNewClientId("");
      toast.success("Scheduled time block created successfully!");
    } catch {
      toast.error("Failed to create schedule block");
    }
  };

  const handleToggleComplete = async (item: WorkScheduleItem) => {
    try {
      const updated = await workSchedulesApi.update(item.id, {
        is_completed: !item.is_completed,
      });
      setSchedules((prev) => prev.map((s) => (s.id === item.id ? updated : s)));
      toast.success(updated.is_completed ? "Marked as completed" : "Marked as active");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await workSchedulesApi.delete(id);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      toast.success("Schedule block removed");
    } catch {
      toast.error("Failed to delete schedule item");
    }
  };

  const getTypeStyle = (type: WorkScheduleItem["type"]) => {
    switch (type) {
      case "client_meeting":
        return {
          bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
          label: "Client Meeting",
        };
      case "shift":
        return {
          bg: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400",
          label: "Shift Window",
        };
      case "focus_time":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
          label: "Deep Work Focus",
        };
      case "review":
        return {
          bg: "bg-sky-500/10 border-sky-500/30 text-sky-400",
          label: "Review Session",
        };
      default:
        return {
          bg: "bg-purple-500/10 border-purple-500/30 text-purple-400",
          label: "Deadline",
        };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <CalendarIcon className="h-6 w-6 text-indigo-400" />
            Work Scheduling & Time Blocks
          </h1>
          <p className="text-sm text-muted-foreground">
            Plan working shifts, client commitments, deliverable reviews, and uninterrupted deep work
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Schedule Block
        </button>
      </div>

      {/* Date Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Clock className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Current Working Day</p>
            <p className="text-sm font-bold text-foreground">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-md border border-border bg-background/50 px-2.5 py-1 text-muted-foreground">
            Standard Shift: <strong className="text-foreground">09:00 AM - 06:00 PM</strong>
          </span>
          <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-400 font-semibold">
            ● Active On-duty
          </span>
        </div>
      </div>

      {/* Timeline Schedule Items */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-indigo-400" />
          Today&apos;s Agenda & Time Blocks
        </h2>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading schedule items...</div>
        ) : schedules.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No schedule blocks created yet for today. Click &quot;Add Schedule Block&quot; to plan your shift.
          </div>
        ) : (
          <div className="relative border-l-2 border-border/80 ml-4 pl-6 space-y-6">
            {schedules.map((item) => {
              const style = getTypeStyle(item.type);
              const startTimeFormatted = item.start_time.includes("T") ? item.start_time.slice(11, 16) : item.start_time;
              const endTimeFormatted = item.end_time.includes("T") ? item.end_time.slice(11, 16) : item.end_time;

              return (
                <div key={item.id} className="relative group">
                  {/* Timeline dot */}
                  <span
                    className={`absolute -left-[31px] top-1.5 flex h-4 w-4 rounded-full border-2 border-card ${
                      item.is_completed ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-indigo-500 ring-2 ring-indigo-500/20"
                    }`}
                  />

                  <div
                    className={`rounded-xl border p-4.5 transition-all ${
                      item.is_completed
                        ? "border-border/60 bg-muted/20 opacity-70"
                        : "border-border bg-background/50 hover:border-indigo-500/40"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${style.bg}`}>
                            {style.label}
                          </span>
                          <span className="font-mono text-xs font-semibold text-indigo-400">
                            {startTimeFormatted} - {endTimeFormatted}
                          </span>
                        </div>
                        <h3 className={`text-base font-semibold ${item.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {item.title}
                        </h3>
                        {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                        {item.client && (
                          <p className="flex items-center gap-1 text-xs font-medium text-amber-400 pt-1">
                            <Building className="h-3.5 w-3.5" />
                            Client: {item.client.company_name}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(item)}
                          className={`rounded-lg p-2 text-xs font-medium transition-colors ${
                            item.is_completed
                              ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                          title={item.is_completed ? "Mark incomplete" : "Mark completed"}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="rounded-lg p-2 text-xs font-medium text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                          title="Delete schedule block"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Schedule Block Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Schedule Work Block</h3>
                <p className="text-xs text-muted-foreground">Add a shift block, client sync, or focus window</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Title / Activity *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Logistics Deliverable Review"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as WorkScheduleItem["type"])}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="client_meeting">Client Meeting</option>
                    <option value="focus_time">Deep Work Focus</option>
                    <option value="shift">Shift Window</option>
                    <option value="review">Review Session</option>
                    <option value="task_deadline">Deadline</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Related Client (Optional)</label>
                  <select
                    value={newClientId}
                    onChange={(e) => setNewClientId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer truncate"
                  >
                    <option value="">None (Internal / General)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Start Time</label>
                  <input
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">End Time</label>
                  <input
                    type="time"
                    required
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Notes / Objectives</label>
                <textarea
                  rows={3}
                  placeholder="Key deliverables, meeting link, or tasks to complete..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
                >
                  Save Schedule Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
