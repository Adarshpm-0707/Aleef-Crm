/**
 * app/(manager)/manager/clients/[id]/page.tsx
 *
 * Scoped Client Detail View for Managers:
 * - Strictly accessible only if client is assigned to current manager
 * - Edit client details, change pipeline stage
 * - Tabbed view: Overview, Tasks & Projects, Activity Timeline, Follow-ups
 * - Log calls/meetings/notes
 * - No delete permission
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  clientsApi,
  tasksApi,
  activitiesApi,
  followUpsApi,
  type Client,
  type Task,
  type ClientActivity,
  type FollowUp,
  type ClientStatus,
} from "@/lib/api";
import {
  useCurrentManager,
  isClientAccessible,
  assertCanEditClient,
} from "@/lib/permissions/manager";
import { PageHeader } from "@/components/shared/PageHeader";
import { Timeline, type TimelineEvent } from "@/components/crm/Timeline";
import { StatCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Edit2,
  Plus,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<ClientStatus, { label: string; style: string }> = {
  lead: { label: "Lead", style: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
  prospect: { label: "Prospect", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  active: { label: "Active Client", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  on_hold: { label: "On Hold", style: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  completed: { label: "Completed", style: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  lost: { label: "Lost", style: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
};

export default function ManagerClientDetailPage() {
  const params = useParams();
  const clientId = params?.id as string;
  const { manager } = useCurrentManager();

  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "timeline" | "followups">("overview");

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Client>>({});

  // Add FollowUp State
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({ next_action: "", due_date: "", notes: "" });

  // Escape listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editOpen) setEditOpen(false);
        if (followUpOpen) setFollowUpOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editOpen, followUpOpen]);

  const loadData = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const [c, tList, aList, fList] = await Promise.all([
        clientsApi.getById(clientId),
        tasksApi.getAll({ clientId }),
        activitiesApi.getByClientId(clientId),
        followUpsApi.getAll({ clientId }),
      ]);
      setClient(c);
      setTasks(tList);
      setActivities(aList);
      setFollowUps(fList);
    } catch {
      toast.error("Failed to load client details");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData, manager.userId]);

  // Security Check: Is this client assigned to this manager?
  const hasAccess = useMemo(() => {
    return isClientAccessible(client, manager.userId);
  }, [client, manager.userId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in" role="status" aria-busy="true">
        <span className="sr-only">Verifying manager assignment & loading details...</span>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  // ── Access Denied State ───────────────────────────────────────────────────
  if (!client || !hasAccess) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center animate-fade-in">
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
            <ShieldAlert className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-foreground">Access Restricted by RLS Policy</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Client ID <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">{clientId}</code> is not assigned to your account (<strong>{manager.fullName}</strong>).
            Under the manager role capability map, you may only access clients assigned to your management portfolio.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/manager/clients"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-glow-amber hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Return to My Clients
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Handlers
  const handleEditOpen = () => {
    assertCanEditClient(client, manager.userId);
    setEditForm({
      company_name: client.company_name,
      contact_person: client.contact_person,
      email: client.email || "",
      phone: client.phone || "",
      industry: client.industry || "",
      address: client.address || "",
      notes: client.notes || "",
      status: client.status,
    });
    setEditOpen(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      assertCanEditClient(client, manager.userId);
      await clientsApi.update(client.id, editForm);
      toast.success("Client details updated successfully");
      setEditOpen(false);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update client");
    }
  };

  const handleStatusChange = async (newStatus: ClientStatus) => {
    try {
      assertCanEditClient(client, manager.userId);
      await clientsApi.updateStatus(client.id, newStatus);
      toast.success(`Pipeline status updated to ${STATUS_LABELS[newStatus]?.label || newStatus}`);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleAddActivityNote = async (note: string) => {
    try {
      await activitiesApi.create({
        client_id: client.id,
        type: "note",
        content: note,
        created_by: manager.userId,
      });
      toast.success("Activity note added");
      loadData();
    } catch {
      toast.error("Failed to add activity note");
    }
  };

  const handleCompleteFollowUp = async (id: string) => {
    try {
      await followUpsApi.complete(id);
      toast.success("Follow-up marked as completed");
      loadData();
    } catch {
      toast.error("Failed to complete follow-up");
    }
  };

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpForm.next_action.trim()) return;
    try {
      await followUpsApi.create({
        client_id: client.id,
        next_action: followUpForm.next_action,
        due_date: followUpForm.due_date || new Date(Date.now() + 86400000).toISOString(),
        notes: followUpForm.notes,
      });
      toast.success("New follow-up reminder created");
      setFollowUpOpen(false);
      setFollowUpForm({ next_action: "", due_date: "", notes: "" });
      loadData();
    } catch {
      toast.error("Failed to create follow-up");
    }
  };

  const timelineEvents: TimelineEvent[] = activities.map((a) => ({
    id: a.id,
    type: a.type === "call" ? "call" : a.type === "meeting" ? "meeting" : "note",
    title: `${a.type.toUpperCase()}: ${client.company_name}`,
    description: a.content,
    createdAt: a.created_at,
    author: { name: a.creator?.full_name || manager.fullName },
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={client.company_name}
        description={`Account Managed by ${manager.fullName} • ${client.industry || "General Enterprise"}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/manager/dashboard" },
          { label: "Clients", href: "/manager/clients" },
          { label: client.company_name },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleEditOpen}
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Edit2 className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <span>Edit Details</span>
            </button>
            <select
              value={client.status}
              onChange={(e) => handleStatusChange(e.target.value as ClientStatus)}
              aria-label="Change pipeline status"
              className={`min-h-[44px] sm:min-h-0 rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer ${
                STATUS_LABELS[client.status]?.style || "bg-muted text-foreground"
              }`}
            >
              <option value="lead">Lead</option>
              <option value="prospect">Prospect</option>
              <option value="active">Active Client</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="lost">Lost</option>
            </select>
          </div>
        }
      />

      {/* Client Quick Stats Header Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Account Status</p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${
                STATUS_LABELS[client.status]?.style
              }`}
            >
              {client.status}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Value</p>
          <p className="mt-1 text-xl font-bold text-foreground">
            SAR {(client.total_revenue || 0).toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tasks / Projects</p>
          <p className="mt-1 text-xl font-bold text-foreground">
            {tasks.length} tasks • {client.active_projects_count || 1} project(s)
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Follow-ups</p>
          <p className="mt-1 text-xl font-bold text-amber-500">
            {followUps.filter((f) => !f.completed_at).length} action(s)
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border overflow-x-auto">
        <nav className="flex space-x-6 min-w-max" aria-label="Client details tabs">
          {[
            { id: "overview" as const, label: "Overview & Contacts" },
            { id: "tasks" as const, label: `Tasks (${tasks.length})` },
            { id: "timeline" as const, label: `Activity History (${activities.length})` },
            { id: "followups" as const, label: `Follow-ups (${followUps.length})` },
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

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-7 space-y-6">
            <h3 className="text-base font-semibold text-foreground">Client Profile & Key Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Contact Person</p>
                <p className="font-medium text-foreground mt-1">{client.contact_person}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Industry</p>
                <p className="font-medium text-foreground mt-1">{client.industry || "Not specified"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium text-foreground mt-1">{client.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium text-foreground mt-1">{client.phone || "—"}</p>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <p className="text-xs text-muted-foreground">Physical Address</p>
                <p className="font-medium text-foreground mt-1">{client.address || "Riyadh, Saudi Arabia"}</p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Account Notes</h4>
              <p className="mt-2 text-sm text-foreground bg-muted/30 p-3 rounded-lg leading-relaxed">
                {client.notes || "No special account notes recorded."}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-5 space-y-6">
            <h3 className="text-base font-semibold text-foreground">Manager Assignment</h3>
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white font-bold">
                {manager.fullName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{manager.fullName}</p>
                <p className="text-xs text-muted-foreground">{manager.designation} • {manager.departmentName}</p>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-4 text-xs text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">RLS Governance Notice:</p>
              <p>
                This account is bound to your manager scope. Other department managers cannot view or edit this client without formal re-assignment by an administrator.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Tasks */}
      {activeTab === "tasks" && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Tasks Associated with {client.company_name}</h3>
              <p className="text-xs text-muted-foreground">Assigned to team members</p>
            </div>
            <Link
              href="/manager/kanban"
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-glow-amber hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Assign New Task</span>
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No tasks currently linked to this client.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tasks.map((task) => (
                <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                  <div>
                    <Link
                      href={`/manager/tasks/${task.id}`}
                      className="text-sm font-medium text-foreground hover:text-amber-500 transition-colors focus-visible:outline-none focus-visible:underline"
                    >
                      {task.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>Assignee: {task.assignee?.full_name || "Team"}</span>
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
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold uppercase text-foreground">
                      {task.status.replace("_", " ")}
                    </span>
                    <Link
                      href={`/manager/tasks/${task.id}`}
                      className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Timeline */}
      {activeTab === "timeline" && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-6">
          <div>
            <h3 className="text-base font-semibold text-foreground">Activity Timeline</h3>
            <p className="text-xs text-muted-foreground">All logged calls, notes, and milestones for this client</p>
          </div>

          <Timeline
            events={timelineEvents}
            canAddNote={true}
            onAddNote={handleAddActivityNote}
          />
        </div>
      )}

      {/* Tab 4: Follow-ups */}
      {activeTab === "followups" && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Action Reminders & Follow-ups</h3>
              <p className="text-xs text-muted-foreground">Keep client engagements on track</p>
            </div>
            <button
              type="button"
              onClick={() => setFollowUpOpen(true)}
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-glow-amber hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Schedule Follow-up</span>
            </button>
          </div>

          {followUps.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No follow-ups currently scheduled for this client.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {followUps.map((fu) => (
                <div key={fu.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                  <div className="space-y-1">
                    <p className={`text-sm font-medium ${fu.completed_at ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {fu.next_action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due: {fu.due_date ? new Date(fu.due_date).toLocaleDateString() : "Pending"}
                      {fu.notes && ` • Note: ${fu.notes}`}
                    </p>
                  </div>

                  <div>
                    {fu.completed_at ? (
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Completed
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCompleteFollowUp(fu.id)}
                        className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1 rounded-lg border border-border bg-secondary px-3 py-1 text-xs font-medium hover:bg-emerald-500 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Mark Done
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Client Modal */}
      {editOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manager-edit-client-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 id="manager-edit-client-modal" className="text-lg font-bold text-foreground">Edit Client: {client.company_name}</h3>
                <p className="text-xs text-muted-foreground">Modify information for this assigned client</p>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                aria-label="Close edit client modal"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="m-client-name" className="text-xs font-semibold text-foreground">Company Name *</label>
                  <input
                    id="m-client-name"
                    type="text"
                    required
                    value={editForm.company_name || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, company_name: e.target.value }))}
                    className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  />
                </div>
                <div>
                  <label htmlFor="m-contact-person" className="text-xs font-semibold text-foreground">Contact Person *</label>
                  <input
                    id="m-contact-person"
                    type="text"
                    required
                    value={editForm.contact_person || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, contact_person: e.target.value }))}
                    className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="m-client-email" className="text-xs font-semibold text-foreground">Email</label>
                  <input
                    id="m-client-email"
                    type="email"
                    value={editForm.email || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  />
                </div>
                <div>
                  <label htmlFor="m-client-phone" className="text-xs font-semibold text-foreground">Phone</label>
                  <input
                    id="m-client-phone"
                    type="tel"
                    value={editForm.phone || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="m-client-industry" className="text-xs font-semibold text-foreground">Industry</label>
                <input
                  id="m-client-industry"
                  type="text"
                  value={editForm.industry || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, industry: e.target.value }))}
                  className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              <div>
                <label htmlFor="m-client-notes" className="text-xs font-semibold text-foreground">Notes</label>
                <textarea
                  id="m-client-notes"
                  rows={3}
                  value={editForm.notes || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
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

      {/* Create Follow-up Modal */}
      {followUpOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manager-schedule-followup-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 id="manager-schedule-followup-modal" className="text-lg font-bold text-foreground">Schedule Follow-up</h3>
              <button
                type="button"
                onClick={() => setFollowUpOpen(false)}
                aria-label="Close schedule follow-up modal"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFollowUp} className="mt-4 space-y-4">
              <div>
                <label htmlFor="fu-action-item" className="text-xs font-semibold text-foreground">Action Item *</label>
                <input
                  id="fu-action-item"
                  type="text"
                  required
                  placeholder="e.g. Follow-up on proposal review"
                  value={followUpForm.next_action}
                  onChange={(e) => setFollowUpForm((f) => ({ ...f, next_action: e.target.value }))}
                  className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              <div>
                <label htmlFor="fu-target-date" className="text-xs font-semibold text-foreground">Target Date *</label>
                <input
                  id="fu-target-date"
                  type="date"
                  required
                  value={followUpForm.due_date}
                  onChange={(e) => setFollowUpForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              <div>
                <label htmlFor="fu-notes" className="text-xs font-semibold text-foreground">Notes</label>
                <textarea
                  id="fu-notes"
                  rows={2}
                  placeholder="Optional context for this reminder"
                  value={followUpForm.notes}
                  onChange={(e) => setFollowUpForm((f) => ({ ...f, notes: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFollowUpOpen(false)}
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-glow-amber hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                >
                  Set Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
