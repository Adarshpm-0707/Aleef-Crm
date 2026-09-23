/**
 * app/(manager)/manager/clients/page.tsx
 *
 * Scoped Client Management for Managers:
 * - Only clients assigned to this manager
 * - Edit client details, update status, add activity
 * - Strictly NO delete (enforced via permissions & UI)
 * - Reuses DataTable, FilterBar, ExportButton, PageHeader
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  clientsApi,
  activitiesApi,
  type Client,
  type ClientStatus,
  type ActivityType,
} from "@/lib/api";
import {
  useCurrentManager,
  filterClientsForManager,
  assertCanEditClient,
} from "@/lib/permissions/manager";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type ColumnDef } from "@/components/shared/DataTable";
import { FilterBar, type FilterBarFilters } from "@/components/shared/FilterBar";
import { ExportButton } from "@/components/shared/ExportButton";
import {
  Edit2,
  Eye,
  Building2,
  Phone,
  Mail,
  ShieldAlert,
  MessageSquarePlus,
  TrendingUp,
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

export default function ManagerClientsPage() {
  const { manager } = useCurrentManager();
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterBarFilters>({});

  // Modals state
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [activityClient, setActivityClient] = useState<Client | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Client>>({});
  const [activityForm, setActivityForm] = useState<{ type: ActivityType; content: string }>({
    type: "note",
    content: "",
  });

  // Handle Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editClient) setEditClient(null);
        if (activityClient) setActivityClient(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editClient, activityClient]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await clientsApi.getAll();
      setAllClients(data);
    } catch {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, manager.userId]);

  // Scoped to current manager only!
  const scopedClients = useMemo(() => {
    return filterClientsForManager(allClients, manager.userId);
  }, [allClients, manager.userId]);

  // Apply search and status filters
  const filteredClients = useMemo(() => {
    return scopedClients.filter((c) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matches =
          c.company_name.toLowerCase().includes(q) ||
          c.contact_person.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.industry?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (filters.status && filters.status !== "all") {
        if (c.status !== filters.status) return false;
      }
      return true;
    });
  }, [scopedClients, filters]);

  // Handlers
  const handleStatusChange = async (client: Client, newStatus: ClientStatus) => {
    try {
      assertCanEditClient(client, manager.userId);
      await clientsApi.updateStatus(client.id, newStatus);
      toast.success(`Status for ${client.company_name} updated to ${STATUS_LABELS[newStatus]?.label || newStatus}`);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleEditOpen = (client: Client) => {
    assertCanEditClient(client, manager.userId);
    setEditClient(client);
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
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClient) return;
    try {
      assertCanEditClient(editClient, manager.userId);
      await clientsApi.update(editClient.id, editForm);
      toast.success(`Updated ${editForm.company_name || editClient.company_name}`);
      setEditClient(null);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update client");
    }
  };

  const handleActivityOpen = (client: Client) => {
    setActivityClient(client);
    setActivityForm({ type: "note", content: "" });
  };

  const handleActivitySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityClient || !activityForm.content.trim()) return;
    try {
      await activitiesApi.create({
        client_id: activityClient.id,
        type: activityForm.type,
        content: activityForm.content,
        created_by: manager.userId,
      });
      toast.success(`Activity logged for ${activityClient.company_name}`);
      setActivityClient(null);
    } catch {
      toast.error("Failed to log activity");
    }
  };

  const columns: ColumnDef<Client>[] = [
    {
      key: "company_name",
      header: "Client & Contact",
      sortable: true,
      cell: (row) => (
        <div className="space-y-1">
          <Link
            href={`/manager/clients/${row.id}`}
            className="font-semibold text-foreground hover:text-amber-500 transition-colors focus-visible:outline-none focus-visible:underline"
          >
            {row.company_name}
          </Link>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{row.contact_person}</span>
            {row.industry && (
              <>
                <span>•</span>
                <span>{row.industry}</span>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact Info",
      cell: (row) => (
        <div className="space-y-1 text-xs text-muted-foreground">
          {row.email && (
            <div className="flex items-center gap-1.5 truncate">
              <Mail className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
              <span>{row.email}</span>
            </div>
          )}
          {row.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
              <span>{row.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Pipeline Status",
      sortable: true,
      cell: (row) => (
        <select
          value={row.status}
          onChange={(e) => handleStatusChange(row, e.target.value as ClientStatus)}
          aria-label={`Status for ${row.company_name}`}
          className={`min-h-[44px] sm:min-h-0 rounded-lg border px-2.5 py-1.5 sm:py-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer ${
            STATUS_LABELS[row.status]?.style || "bg-muted text-foreground"
          }`}
        >
          <option value="lead">Lead</option>
          <option value="prospect">Prospect</option>
          <option value="active">Active Client</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="lost">Lost</option>
        </select>
      ),
    },
    {
      key: "total_revenue",
      header: "Value / Projects",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-semibold text-foreground text-sm">
            SAR {(row.total_revenue || 0).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.active_projects_count || 0} active project(s)
          </div>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Link
            href={`/manager/clients/${row.id}`}
            title="View Details"
            aria-label={`View details for ${row.company_name}`}
            className="inline-flex min-h-[44px] min-w-[44px] sm:min-h-8 sm:min-w-8 h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <button
            type="button"
            title="Edit Client"
            aria-label={`Edit ${row.company_name}`}
            onClick={() => handleEditOpen(row)}
            className="inline-flex min-h-[44px] min-w-[44px] sm:min-h-8 sm:min-w-8 h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Log Activity"
            aria-label={`Log activity for ${row.company_name}`}
            onClick={() => handleActivityOpen(row)}
            className="inline-flex min-h-[44px] min-w-[44px] sm:min-h-8 sm:min-w-8 h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const totalValue = scopedClients.reduce((acc, c) => acc + (c.total_revenue || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="My Assigned Clients"
        description={`Portfolio management scoped strictly to ${manager.fullName}. You can update details and log activities. Deletion is restricted.`}
        breadcrumbs={[
          { label: "Dashboard", href: "/manager/dashboard" },
          { label: "Clients" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <ExportButton
              data={scopedClients.map((c) => ({
                "Company Name": c.company_name,
                "Contact Person": c.contact_person,
                "Email": c.email || "",
                "Phone": c.phone || "",
                "Industry": c.industry || "",
                "Status": c.status,
                "Revenue (SAR)": c.total_revenue || 0,
              }))}
              filename={`assigned-clients-${manager.fullName.toLowerCase().replace(/\s+/g, "-")}`}
              columns={[
                { header: "Company Name", key: "Company Name" },
                { header: "Contact Person", key: "Contact Person" },
                { header: "Email", key: "Email" },
                { header: "Phone", key: "Phone" },
                { header: "Industry", key: "Industry" },
                { header: "Status", key: "Status" },
                { header: "Revenue (SAR)", key: "Revenue (SAR)" },
              ]}
            />
          </div>
        }
      />

      {/* Scope Info & KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned Clients</p>
            <p className="text-2xl font-bold text-foreground mt-1">{scopedClients.length}</p>
          </div>
          <Building2 className="h-8 w-8 text-amber-500 opacity-60" aria-hidden="true" />
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Portfolio Total Value</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              SAR {totalValue.toLocaleString()}
            </p>
          </div>
          <TrendingUp className="h-8 w-8 text-emerald-500 opacity-60" aria-hidden="true" />
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Clients</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {scopedClients.filter((c) => c.status === "active").length}
            </p>
          </div>
          <Building2 className="h-8 w-8 text-blue-500 opacity-60" aria-hidden="true" />
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        statusOptions={[
          { value: "lead", label: "Lead" },
          { value: "prospect", label: "Prospect" },
          { value: "active", label: "Active Client" },
          { value: "on_hold", label: "On Hold" },
          { value: "completed", label: "Completed" },
          { value: "lost", label: "Lost" },
        ]}
      />

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredClients}
        rowKey="id"
        loading={loading}
        defaultPageSize={8}
        emptyTitle="No assigned clients found"
        emptyDescription={`No clients are currently assigned to ${manager.fullName} matching the active filters.`}
      />

      {/* Edit Client Modal */}
      {editClient && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-client-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 id="edit-client-modal-title" className="text-lg font-bold text-foreground">Edit Client: {editClient.company_name}</h3>
                <p className="text-xs text-muted-foreground">Modify client details and pipeline stage</p>
              </div>
              <button
                type="button"
                onClick={() => setEditClient(null)}
                aria-label="Close edit client modal"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-client-name" className="text-xs font-semibold text-foreground">Company Name *</label>
                  <input
                    id="edit-client-name"
                    type="text"
                    required
                    value={editForm.company_name || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, company_name: e.target.value }))}
                    className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  />
                </div>
                <div>
                  <label htmlFor="edit-client-contact" className="text-xs font-semibold text-foreground">Contact Person *</label>
                  <input
                    id="edit-client-contact"
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
                  <label htmlFor="edit-client-email" className="text-xs font-semibold text-foreground">Email</label>
                  <input
                    id="edit-client-email"
                    type="email"
                    value={editForm.email || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  />
                </div>
                <div>
                  <label htmlFor="edit-client-phone" className="text-xs font-semibold text-foreground">Phone</label>
                  <input
                    id="edit-client-phone"
                    type="tel"
                    value={editForm.phone || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-client-industry" className="text-xs font-semibold text-foreground">Industry</label>
                  <input
                    id="edit-client-industry"
                    type="text"
                    value={editForm.industry || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, industry: e.target.value }))}
                    className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  />
                </div>
                <div>
                  <label htmlFor="edit-client-status" className="text-xs font-semibold text-foreground">Pipeline Status</label>
                  <select
                    id="edit-client-status"
                    value={editForm.status || "lead"}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as ClientStatus }))}
                    className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
                  >
                    <option value="lead">Lead</option>
                    <option value="prospect">Prospect</option>
                    <option value="active">Active Client</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="edit-client-address" className="text-xs font-semibold text-foreground">Address</label>
                <input
                  id="edit-client-address"
                  type="text"
                  value={editForm.address || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                  className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              <div>
                <label htmlFor="edit-client-notes" className="text-xs font-semibold text-foreground">Notes & Instructions</label>
                <textarea
                  id="edit-client-notes"
                  rows={3}
                  value={editForm.notes || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              {/* Permission Badge notice */}
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
                <ShieldAlert className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>Client records cannot be deleted by managers. Reassignment requires admin approval.</span>
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditClient(null)}
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

      {/* Log Activity Modal */}
      {activityClient && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="activity-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 id="activity-modal-title" className="text-lg font-bold text-foreground">Log Activity: {activityClient.company_name}</h3>
                <p className="text-xs text-muted-foreground">Add calls, meetings, or notes to this client&apos;s timeline</p>
              </div>
              <button
                type="button"
                onClick={() => setActivityClient(null)}
                aria-label="Close log activity modal"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleActivitySave} className="mt-4 space-y-4">
              <div>
                <label htmlFor="activity-type-select" className="text-xs font-semibold text-foreground">Activity Type</label>
                <select
                  id="activity-type-select"
                  value={activityForm.type}
                  onChange={(e) => setActivityForm((f) => ({ ...f, type: e.target.value as ActivityType }))}
                  className="mt-1 w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
                >
                  <option value="note">Internal Note</option>
                  <option value="call">Phone Call</option>
                  <option value="meeting">Meeting / Demo</option>
                  <option value="update">Status Update</option>
                </select>
              </div>

              <div>
                <label htmlFor="activity-content-textarea" className="text-xs font-semibold text-foreground">Activity Summary / Minutes *</label>
                <textarea
                  id="activity-content-textarea"
                  required
                  rows={4}
                  placeholder="Record summary of discussion, decisions made, or key follow-up items..."
                  value={activityForm.content}
                  onChange={(e) => setActivityForm((f) => ({ ...f, content: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActivityClient(null)}
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-glow-amber hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                >
                  Add Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
