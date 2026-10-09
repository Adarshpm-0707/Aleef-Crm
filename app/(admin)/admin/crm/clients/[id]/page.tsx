/**
 * app/(admin)/admin/crm/clients/[id]/page.tsx
 *
 * Client Profile Page:
 * - Summary Header with KPIs, manager reassign, status change
 * - Activity Timeline with quick "Add Note / Log Meeting" form
 * - Linked Leads tab
 * - Linked Projects & Tasks tab
 * - Scheduled Follow-ups tab
 */

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  clientsApi,
  activitiesApi,
  leadsApi,
  projectsApi,
  tasksApi,
  followUpsApi,
  usersApi,
  type Client,
  type ClientActivity,
  type Lead,
  type Project,
  type Task,
  type FollowUp,
  type User,
  type ClientStatus,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { Timeline, type TimelineEvent } from "@/components/crm/Timeline";
import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Plus,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

export default function ClientProfilePage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;

  const [client, setClient] = useState<Client | null>(null);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<"timeline" | "leads" | "projects" | "followups">("timeline");
  const [loading, setLoading] = useState(true);

  // Quick note modal
  const [noteContent, setNoteContent] = useState("");
  const [noteType, setNoteType] = useState<"call" | "meeting" | "note">("note");

  const loadData = useCallback(async () => {
    if (!clientId) return;
    try {
      const [c, act, l, p, t, fu, u] = await Promise.all([
        clientsApi.getById(clientId),
        activitiesApi.getByClientId(clientId),
        leadsApi.getAll({ search: "" }),
        projectsApi.getAll({ clientId }),
        tasksApi.getAll({ clientId }),
        followUpsApi.getAll({ clientId }),
        usersApi.getAll(),
      ]);
      setClient(c);
      setActivities(act);
      setLeads(l.filter((lead) => lead.client_id === clientId));
      setProjects(p);
      setTasks(t);
      setFollowUps(fu);
      setUsers(u);
    } catch {
      toast.error("Failed to load client profile");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() || !client) return;
    try {
      await activitiesApi.create({
        client_id: client.id,
        type: noteType,
        content: noteContent.trim(),
        created_by: users[0]?.id || "u-admin-1",
      });
      toast.success("Activity logged successfully");
      setNoteContent("");
      const updatedActs = await activitiesApi.getByClientId(client.id);
      setActivities(updatedActs);
    } catch {
      toast.error("Failed to log activity");
    }
  };

  const handleCompleteFollowUp = async (fuId: string) => {
    try {
      await followUpsApi.complete(fuId);
      toast.success("Follow-up marked as completed");
      loadData();
    } catch {
      toast.error("Failed to update follow-up");
    }
  };

  const handleStatusChange = async (newStatus: ClientStatus) => {
    if (!client) return;
    try {
      await clientsApi.updateStatus(client.id, newStatus);
      toast.success(`Status updated to ${newStatus}`);
      setClient({ ...client, status: newStatus });
    } catch {
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-busy="true">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-64" />
        </div>
        {/* Profile Card Skeleton */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-16 w-28 rounded-xl" />
              <Skeleton className="h-16 w-28 rounded-xl" />
              <Skeleton className="h-16 w-28 rounded-xl" />
            </div>
          </div>
        </div>
        {/* Tabs & Content Skeleton */}
        <div className="flex gap-4 border-b border-border pb-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-4">
        <Link href="/admin/crm/clients" className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Clients
        </Link>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <h2 className="text-lg font-semibold">Client not found</h2>
          <p className="mt-1 text-sm text-muted-foreground">The requested client record does not exist.</p>
        </div>
      </div>
    );
  }

  // Convert activities to Timeline events format
  const timelineEvents: TimelineEvent[] = activities.map((a) => ({
    id: a.id,
    type: (a.type === "update" ? "status-change" : a.type) as TimelineEvent["type"],
    title: a.type.toUpperCase(),
    description: a.content,
    createdAt: a.created_at,
    author: { name: a.creator?.full_name || "Admin" },
  }));

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <PageHeader
        title={client.company_name}
        description={`Account profile & activity ledger &bull; Contact: ${client.contact_person}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Clients", href: "/admin/crm/clients" },
          { label: client.company_name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/crm/clients"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" /> Back to List
            </Link>
          </div>
        }
      />

      {/* Hero Profile Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-600 font-bold text-2xl shadow-sm">
              <Building2 className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{client.company_name}</h1>
                <select
                  value={client.status}
                  onChange={(e) => handleStatusChange(e.target.value as ClientStatus)}
                  className="h-7 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 text-xs font-semibold text-teal-700 dark:text-teal-400 focus-visible:outline-none"
                >
                  <option value="lead">Lead</option>
                  <option value="prospect">Prospect</option>
                  <option value="active">Active Client</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <p className="text-sm text-muted-foreground">{client.industry || "Industry Not Specified"}</p>
              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
                {client.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-teal-600" />
                    {client.email}
                  </span>
                )}
                {client.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-teal-600" />
                    {client.phone}
                  </span>
                )}
                {client.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-teal-600" />
                    {client.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick KPIs on Right */}
          <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
            <div className="rounded-xl bg-muted/40 p-3 min-w-[120px]">
              <span className="text-xs text-muted-foreground">Total Revenue</span>
              <p className="mt-1 text-lg font-bold text-foreground">
                ₹ {(client.total_revenue || 120000).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3 min-w-[120px]">
              <span className="text-xs text-muted-foreground">Active Projects</span>
              <p className="mt-1 text-lg font-bold text-foreground">{projects.length}</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3 min-w-[120px]">
              <span className="text-xs text-muted-foreground">Open Tasks</span>
              <p className="mt-1 text-lg font-bold text-foreground">
                {tasks.filter((t) => t.status !== "completed").length}
              </p>
            </div>
          </div>
        </div>

        {client.notes && (
          <div className="mt-4 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Internal Notes: </strong>
            {client.notes}
          </div>
        )}
      </div>

      {/* Tabs Strip */}
      <div className="flex overflow-x-auto border-b border-border" role="tablist" aria-label="Client detail views">
        {[
          { key: "timeline", label: "Activity Timeline", count: activities.length },
          { key: "leads", label: "Linked Leads", count: leads.length },
          { key: "projects", label: "Projects & Tasks", count: projects.length },
          { key: "followups", label: "Follow-ups", count: followUps.length },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key as "timeline" | "leads" | "projects" | "followups")}
            className={`flex min-h-[44px] sm:min-h-0 items-center gap-2 border-b-2 px-4 sm:px-5 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
              activeTab === tab.key
                ? "border-teal-500 text-teal-600 dark:text-teal-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab 1: Timeline */}
      {activeTab === "timeline" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-foreground">Client Interaction History</h2>
              <Timeline events={timelineEvents} />
            </div>
          </div>

          {/* Quick Action / Add Note Card */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm h-fit">
            <h3 className="text-sm font-semibold text-foreground">Log Interaction</h3>
            <p className="mt-1 text-xs text-muted-foreground">Record a call, meeting, or memo for this client.</p>

            <form onSubmit={handleAddActivity} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">Interaction Type</label>
                <div className="mt-1 flex gap-2">
                  {(["note", "call", "meeting"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNoteType(t)}
                      className={`flex-1 min-h-[44px] sm:min-h-0 rounded-lg py-1.5 text-xs font-medium capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                        noteType === t
                          ? "bg-teal-600 text-white shadow-sm"
                          : "border border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="log-interaction-details" className="text-xs font-medium text-foreground">Details</label>
                <textarea
                  id="log-interaction-details"
                  rows={3}
                  required
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder={`Summary of the ${noteType}...`}
                  className="mt-1 w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] sm:min-h-0 rounded-lg bg-teal-600 py-2.5 sm:py-2 text-xs font-medium text-white shadow-sm hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                Save Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Linked Leads */}
      {activeTab === "leads" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Pipeline Leads for {client.company_name}</h2>
            <Link
              href="/admin/crm/leads"
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
            >
              <Plus className="h-3.5 w-3.5" /> New Lead
            </Link>
          </div>

          {leads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No leads currently linked to this client.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {leads.map((l) => (
                <div key={l.id} className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-foreground text-sm">{l.title}</h3>
                    <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400 capitalize">
                      {l.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Contact: {l.contact_name}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                    <span className="font-bold text-teal-600">₹ {(l.lead_value || 0).toLocaleString("en-IN")}</span>
                    <span className="text-muted-foreground">Next: {l.follow_up_date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Projects & Tasks */}
      {activeTab === "projects" && (
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">Active Client Projects</h2>
            {projects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No active projects for this client.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {projects.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">{p.name}</h3>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </div>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 capitalize">
                        {p.status}
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span className="font-semibold text-foreground">{p.progress}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full" style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">Associated Tasks</h2>
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
              {tasks.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No tasks linked directly.</p>
              ) : (
                tasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-4 text-sm">
                    <div className="space-y-0.5">
                      <Link
                        href={`/admin/projects/tasks/${t.id}`}
                        className="font-medium text-foreground hover:text-teal-600 hover:underline"
                      >
                        {t.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        Priority: <span className="capitalize font-semibold">{t.priority}</span> &bull; Assignee:{" "}
                        {t.assignee?.full_name || "Unassigned"}
                      </p>
                    </div>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium capitalize">
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Follow-ups */}
      {activeTab === "followups" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Follow-up Reminders</h2>
            <Link
              href="/admin/crm/follow-ups"
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
            >
              <Plus className="h-3.5 w-3.5" /> Schedule Follow-up
            </Link>
          </div>

          {followUps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No follow-ups scheduled for this client.
            </div>
          ) : (
            <div className="space-y-3">
              {followUps.map((fu) => (
                <div
                  key={fu.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{fu.next_action}</p>
                    <p className="text-xs text-muted-foreground">
                      Due: {new Date(fu.due_date).toLocaleDateString()} {fu.notes && `&bull; ${fu.notes}`}
                    </p>
                  </div>
                  {fu.completed_at ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                      <CheckCircle2 className="h-4 w-4" /> Completed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCompleteFollowUp(fu.id)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
