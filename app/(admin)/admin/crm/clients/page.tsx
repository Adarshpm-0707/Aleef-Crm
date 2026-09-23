/**
 * app/(admin)/admin/crm/clients/page.tsx
 *
 * Full CRUD Client List:
 * - Add new client modal / route
 * - Edit client details
 * - Delete client
 * - Reassign manager
 * - Change pipeline status
 * - Search, filter, and sort via DataTable
 * - Export to CSV, Excel, PDF via ExportButton
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  clientsApi,
  usersApi,
  type Client,
  type User,
  type ClientStatus,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type ColumnDef } from "@/components/shared/DataTable";
import { FilterBar, type FilterBarFilters } from "@/components/shared/FilterBar";
import { ExportButton } from "@/components/shared/ExportButton";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  Building2,
  Phone,
  Mail,
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

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterBarFilters>({});

  // Modals state
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [cList, uList] = await Promise.all([
        clientsApi.getAll(),
        usersApi.getAll(),
      ]);
      setClients(cList);
      setUsers(uList);
    } catch {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, []);

  // Escape key handler for open modals
  useEffect(() => {
    if (!editClient && !deleteClient) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditClient(null);
        setDeleteClient(null);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [editClient, deleteClient]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (client: Client, newStatus: ClientStatus) => {
    try {
      await clientsApi.updateStatus(client.id, newStatus);
      toast.success(`Status for ${client.company_name} updated to ${STATUS_LABELS[newStatus]?.label || newStatus}`);
      loadData();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleManagerChange = async (client: Client, managerId: string) => {
    try {
      await clientsApi.assignManager(client.id, managerId);
      const mgr = users.find((u) => u.id === managerId);
      toast.success(`Assigned ${mgr?.full_name || "Manager"} to ${client.company_name}`);
      loadData();
    } catch {
      toast.error("Failed to reassign manager");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteClient) return;
    try {
      await clientsApi.delete(deleteClient.id);
      toast.success(`Client ${deleteClient.company_name} deleted`);
      setDeleteClient(null);
      loadData();
    } catch {
      toast.error("Failed to delete client");
    }
  };

  const handleEditSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editClient) return;
    try {
      await clientsApi.update(editClient.id, {
        company_name: editClient.company_name,
        contact_person: editClient.contact_person,
        email: editClient.email,
        phone: editClient.phone,
        industry: editClient.industry,
        assigned_manager_id: editClient.assigned_manager_id,
        status: editClient.status,
      });
      toast.success(`Client ${editClient.company_name} updated`);
      setEditClient(null);
      loadData();
    } catch {
      toast.error("Failed to save client");
    }
  };

  // Filtered rows
  const filteredData = useMemo(() => {
    return clients.filter((c) => {
      if (filters.status && c.status !== filters.status) return false;
      if (filters.assignee && c.assigned_manager_id !== filters.assignee) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match =
          c.company_name.toLowerCase().includes(q) ||
          c.contact_person.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.industry && c.industry.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [clients, filters]);

  // Export columns & data
  const exportColumns = [
    { key: "company_name", header: "Company Name" },
    { key: "contact_person", header: "Contact Person" },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone" },
    { key: "status", header: "Status" },
    { key: "manager", header: "Assigned Manager" },
    { key: "industry", header: "Industry" },
  ];

  const exportData = useMemo(() => {
    return filteredData.map((c) => ({
      company_name: c.company_name,
      contact_person: c.contact_person,
      email: c.email || "",
      phone: c.phone || "",
      status: c.status,
      manager: c.assigned_manager?.full_name || "Unassigned",
      industry: c.industry || "",
    }));
  }, [filteredData]);

  // DataTable columns
  const columns: ColumnDef<Client>[] = [
    {
      key: "company_name",
      header: "Company / Client",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 font-semibold">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <Link
              href={`/admin/crm/clients/${row.id}`}
              className="font-semibold text-foreground hover:text-teal-600 transition hover:underline"
            >
              {row.company_name}
            </Link>
            <p className="text-xs text-muted-foreground">{row.industry || "General Industry"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "contact_person",
      header: "Contact Person",
      sortable: true,
      cell: (row) => (
        <div className="space-y-0.5">
          <p className="font-medium text-foreground">{row.contact_person}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {row.email && (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {row.email}
              </span>
            )}
            {row.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {row.phone}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "assigned_manager_id",
      header: "Manager",
      cell: (row) => (
        <select
          value={row.assigned_manager_id || ""}
          onChange={(e) => handleManagerChange(row, e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Unassigned</option>
          {users
            .filter((u) => u.role === "manager" || u.role === "admin")
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
        </select>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (row) => {
        const meta = STATUS_LABELS[row.status] || STATUS_LABELS.lead;
        return (
          <select
            value={row.status}
            onChange={(e) => handleStatusChange(row, e.target.value as ClientStatus)}
            className={`h-7 rounded-full border px-2 text-xs font-semibold uppercase tracking-wider ${meta.style} focus-visible:outline-none`}
          >
            {Object.keys(STATUS_LABELS).map((st) => (
              <option key={st} value={st} className="bg-popover text-foreground">
                {STATUS_LABELS[st as ClientStatus].label}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/admin/crm/clients/${row.id}`}
            title="View Profile"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => setEditClient(row)}
            title="Edit Client"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteClient(row)}
            title="Delete Client"
            className="rounded p-1.5 text-rose-500 hover:bg-rose-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients Directory"
        description="Comprehensive CRM client management, contract statuses, and assigned account executives."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "CRM", href: "/admin/crm/clients" },
          { label: "Clients" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <ExportButton filename="aleef_clients_roster" columns={exportColumns} data={exportData} />
            <Link
              href="/admin/crm/clients/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              Add Client
            </Link>
          </div>
        }
      />

      {/* Filter strip */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        statusOptions={[
          { value: "lead", label: "Lead" },
          { value: "prospect", label: "Prospect" },
          { value: "active", label: "Active" },
          { value: "on_hold", label: "On Hold" },
          { value: "completed", label: "Completed" },
          { value: "lost", label: "Lost" },
        ]}
        assigneeOptions={users
          .filter((u) => u.role === "manager" || u.role === "admin")
          .map((u) => ({ value: u.id, label: u.full_name }))}
      />

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        emptyTitle="No clients found"
        emptyDescription="Try clearing your filters or create a new client record."
      />

      {/* Edit Client Dialog */}
      {editClient && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-client-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in">
            <h3 id="edit-client-title" className="text-lg font-semibold text-foreground">Edit Client Record</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Modify account attributes, pipeline status, and assigned manager.
            </p>

            <form onSubmit={handleEditSave} className="mt-4 space-y-4">
              <div>
                <label htmlFor="edit-client-company" className="text-xs font-medium text-foreground">Company Name *</label>
                <input
                  id="edit-client-company"
                  type="text"
                  required
                  value={editClient.company_name}
                  onChange={(e) => setEditClient({ ...editClient, company_name: e.target.value })}
                  className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-client-contact" className="text-xs font-medium text-foreground">Contact Person *</label>
                  <input
                    id="edit-client-contact"
                    type="text"
                    required
                    value={editClient.contact_person}
                    onChange={(e) => setEditClient({ ...editClient, contact_person: e.target.value })}
                    className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="edit-client-industry" className="text-xs font-medium text-foreground">Industry</label>
                  <input
                    id="edit-client-industry"
                    type="text"
                    value={editClient.industry || ""}
                    onChange={(e) => setEditClient({ ...editClient, industry: e.target.value })}
                    className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-client-email" className="text-xs font-medium text-foreground">Email</label>
                  <input
                    id="edit-client-email"
                    type="email"
                    value={editClient.email || ""}
                    onChange={(e) => setEditClient({ ...editClient, email: e.target.value })}
                    className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="edit-client-phone" className="text-xs font-medium text-foreground">Phone</label>
                  <input
                    id="edit-client-phone"
                    type="text"
                    value={editClient.phone || ""}
                    onChange={(e) => setEditClient({ ...editClient, phone: e.target.value })}
                    className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-client-manager" className="text-xs font-medium text-foreground">Assigned Manager</label>
                  <select
                    id="edit-client-manager"
                    value={editClient.assigned_manager_id || ""}
                    onChange={(e) => setEditClient({ ...editClient, assigned_manager_id: e.target.value || undefined })}
                    className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {users
                      .filter((u) => u.role === "manager" || u.role === "admin")
                      .map((u) => (
                        <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-client-status" className="text-xs font-medium text-foreground">Status</label>
                  <select
                    id="edit-client-status"
                    value={editClient.status}
                    onChange={(e) => setEditClient({ ...editClient, status: e.target.value as ClientStatus })}
                    className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
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
                <label htmlFor="edit-client-notes" className="text-xs font-medium text-foreground">Account Notes</label>
                <textarea
                  id="edit-client-notes"
                  rows={3}
                  value={editClient.notes || ""}
                  onChange={(e) => setEditClient({ ...editClient, notes: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditClient(null)}
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteClient && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-client-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in">
            <h3 id="delete-client-title" className="text-lg font-semibold text-foreground">Confirm Client Deletion</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{deleteClient.company_name}</span>? All linked records will be unlinked or removed. This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteClient(null)}
                className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                Delete Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
