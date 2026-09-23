/**
 * app/(admin)/admin/crm/follow-ups/page.tsx
 *
 * Follow-up list with due reminders:
 * - Overdue, Due Today, Upcoming, and Completed sections
 * - Mark as Completed button with instant state update
 * - Schedule new follow-up modal
 * - Client filter and search
 */

"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  followUpsApi,
  clientsApi,
  type FollowUp,
  type Client,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { CardSkeleton } from "@/components/ui/skeleton";
import {
  ClockAlert,
  CalendarCheck,
  CheckCircle2,
  Calendar,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminFollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedClient, setSelectedClient] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);

  const [newForm, setNewForm] = useState({
    client_id: "",
    next_action: "",
    due_date: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    notes: "",
  });

  const loadData = useCallback(async () => {
    try {
      const [fList, cList] = await Promise.all([
        followUpsApi.getAll(),
        clientsApi.getAll(),
      ]);
      setFollowUps(fList);
      setClients(cList);
      if (cList.length > 0) {
        setNewForm((prev) => (prev.client_id ? prev : { ...prev, client_id: cList[0].id }));
      }
    } catch {
      toast.error("Failed to load follow-ups");
    } finally {
      setLoading(false);
    }
  }, []);

  // Escape key handler for modal
  useEffect(() => {
    if (!showAddModal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAddModal(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showAddModal]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleComplete = async (id: string) => {
    try {
      await followUpsApi.complete(id);
      toast.success("Follow-up marked as completed!");
      loadData();
    } catch {
      toast.error("Failed to complete follow-up");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await followUpsApi.delete(id);
      toast.success("Follow-up removed");
      loadData();
    } catch {
      toast.error("Failed to delete follow-up");
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.client_id || !newForm.next_action.trim()) {
      toast.error("Please specify client and next action.");
      return;
    }

    try {
      await followUpsApi.create({
        client_id: newForm.client_id,
        next_action: newForm.next_action.trim(),
        due_date: new Date(newForm.due_date).toISOString(),
        notes: newForm.notes.trim(),
      });
      toast.success("New follow-up scheduled!");
      setShowAddModal(false);
      setNewForm({
        client_id: clients[0]?.id || "",
        next_action: "",
        due_date: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        notes: "",
      });
      loadData();
    } catch {
      toast.error("Failed to schedule follow-up");
    }
  };

  const filtered = useMemo(() => {
    if (!selectedClient) return followUps;
    return followUps.filter((f) => f.client_id === selectedClient);
  }, [followUps, selectedClient]);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const overdue = filtered.filter(
    (f) => !f.completed_at && f.due_date.slice(0, 10) < todayStr
  );
  const dueToday = filtered.filter(
    (f) => !f.completed_at && f.due_date.slice(0, 10) === todayStr
  );
  const upcoming = filtered.filter(
    (f) => !f.completed_at && f.due_date.slice(0, 10) > todayStr
  );
  const completed = filtered.filter((f) => !!f.completed_at);

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM Follow-ups & Reminders"
        description="Upcoming calls, contract reviews, and prospect touchpoints across all accounts."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "CRM", href: "/admin/crm/clients" },
          { label: "Follow-ups" },
        ]}
        actions={
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 transition"
          >
            <Plus className="h-4 w-4" /> Schedule Follow-up
          </button>
        }
      />

      {/* Filter strip */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <label htmlFor="followup-client-filter" className="text-xs font-medium text-muted-foreground">Filter Client:</label>
          <select
            id="followup-client-filter"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="min-h-[44px] sm:min-h-8 sm:h-8 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <option value="">All Clients ({clients.length})</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
          <span className="text-rose-600 dark:text-rose-400 font-semibold">{overdue.length} Overdue</span>
          <span className="text-amber-600 dark:text-amber-400 font-semibold">{dueToday.length} Due Today</span>
          <span>{upcoming.length} Upcoming</span>
        </div>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="space-y-4" role="status" aria-busy="true">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
      <div className="space-y-6">
        {/* Section 1: Overdue */}
        {overdue.length > 0 && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ClockAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              <h2 className="text-base font-semibold text-rose-700 dark:text-rose-300">
                Overdue Follow-ups ({overdue.length})
              </h2>
            </div>
            <div className="space-y-2.5">
              {overdue.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg border border-rose-500/20 bg-card p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground text-sm">{item.next_action}</p>
                    <p className="text-xs text-muted-foreground">
                      Client:{" "}
                      <Link
                        href={`/admin/crm/clients/${item.client_id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {item.client?.company_name}
                      </Link>{" "}
                      &bull; Due:{" "}
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        {new Date(item.due_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </p>
                    {item.notes && <p className="text-xs text-muted-foreground italic">{item.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleComplete(item.id)}
                      className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700"
                    >
                      Mark Done
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Due Today */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CalendarCheck className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-semibold text-foreground">
              Due Today ({dueToday.length})
            </h2>
          </div>
          {dueToday.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No follow-ups due today.</p>
          ) : (
            <div className="space-y-2.5">
              {dueToday.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground text-sm">{item.next_action}</p>
                    <p className="text-xs text-muted-foreground">
                      Client:{" "}
                      <Link
                        href={`/admin/crm/clients/${item.client_id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {item.client?.company_name}
                      </Link>{" "}
                      &bull; Time: {new Date(item.due_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleComplete(item.id)}
                      className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700"
                    >
                      Mark Done
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Upcoming */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-teal-600" />
            <h2 className="text-base font-semibold text-foreground">
              Upcoming Reminders ({upcoming.length})
            </h2>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No upcoming follow-ups scheduled.</p>
          ) : (
            <div className="space-y-2.5">
              {upcoming.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground text-sm">{item.next_action}</p>
                    <p className="text-xs text-muted-foreground">
                      Client: {item.client?.company_name} &bull; Due:{" "}
                      <span className="font-medium text-foreground">
                        {new Date(item.due_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleComplete(item.id)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      Mark Done
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Completed History */}
        {completed.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Completed Tasks ({completed.length})
            </h2>
            <div className="space-y-2">
              {completed.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-border/40 p-3 text-xs opacity-75"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="line-through text-muted-foreground">{item.next_action}</span>
                    <span className="text-muted-foreground">({item.client?.company_name})</span>
                  </div>
                  <span className="text-muted-foreground">
                    Done on {new Date(item.completed_at!).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Schedule Follow-up Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-followup-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in">
            <h3 id="schedule-followup-title" className="text-lg font-semibold text-foreground">Schedule Follow-up</h3>
            <p className="mt-1 text-xs text-muted-foreground">Create a reminder linked to an account.</p>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="followup-client-select" className="text-xs font-medium text-foreground">Target Client *</label>
                <select
                  id="followup-client-select"
                  required
                  value={newForm.client_id}
                  onChange={(e) => setNewForm({ ...newForm, client_id: e.target.value })}
                  className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} ({c.contact_person})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="followup-action-input" className="text-xs font-medium text-foreground">Next Action Required *</label>
                <input
                  id="followup-action-input"
                  type="text"
                  required
                  placeholder="e.g. Call regarding SLA pricing review"
                  value={newForm.next_action}
                  onChange={(e) => setNewForm({ ...newForm, next_action: e.target.value })}
                  className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label htmlFor="followup-due-date" className="text-xs font-medium text-foreground">Due Date & Time *</label>
                <input
                  id="followup-due-date"
                  type="datetime-local"
                  required
                  value={newForm.due_date}
                  onChange={(e) => setNewForm({ ...newForm, due_date: e.target.value })}
                  className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                />
              </div>

              <div>
                <label htmlFor="followup-notes-input" className="text-xs font-medium text-foreground">Notes (Optional)</label>
                <textarea
                  id="followup-notes-input"
                  rows={2}
                  placeholder="Add phone numbers, talking points..."
                  value={newForm.notes}
                  onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  Save Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
