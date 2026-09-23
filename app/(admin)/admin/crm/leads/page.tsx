/**
 * app/(admin)/admin/crm/leads/page.tsx
 *
 * Full Lead Management & Convert-to-Client Pipeline:
 * - Summary KPI cards (Pipeline Value, Total Leads, Won Deals)
 * - Lead CRUD (Add lead, Edit lead, Delete lead)
 * - Convert-to-Client action with automatic client record creation
 * - Filter by Stage, Owner, and Search
 * - ExportButton for CSV/PDF/Excel
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  leadsApi,
  usersApi,
  type Lead,
  type User,
  type LeadStatus,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type ColumnDef } from "@/components/shared/DataTable";
import { ExportButton } from "@/components/shared/ExportButton";
import {
  Plus,
  ArrowRightCircle,
  Edit2,
  Trash2,
  Phone,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

const STAGES: Record<LeadStatus, { label: string; style: string }> = {
  new: { label: "New Lead", style: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
  contacted: { label: "Contacted", style: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  qualified: { label: "Qualified", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  proposal_sent: { label: "Proposal Sent", style: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  negotiation: { label: "Negotiation", style: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  won: { label: "Won Deal", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  lost: { label: "Lost", style: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
};

export default function AdminLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [stageFilter, setStageFilter] = useState<string>("");
  const [ownerFilter, setOwnerFilter] = useState<string>("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null);

  // New Lead Form State
  const [newForm, setNewForm] = useState({
    title: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    lead_value: 50000,
    status: "new" as LeadStatus,
    owner_id: "",
    follow_up_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    notes: "",
  });

  const loadData = useCallback(async () => {
    try {
      const [lList, uList] = await Promise.all([
        leadsApi.getAll(),
        usersApi.getAll(),
      ]);
      setLeads(lList);
      setUsers(uList);
      if (uList.length > 0 && !newForm.owner_id) {
        setNewForm((prev) => ({ ...prev, owner_id: uList[0].id }));
      }
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [newForm.owner_id]);

  // Escape key handler for open modals
  useEffect(() => {
    if (!showAddModal && !editLead && !deleteLead) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowAddModal(false);
        setEditLead(null);
        setDeleteLead(null);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showAddModal, editLead, deleteLead]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Convert to Client
  const handleConvertToClient = async (lead: Lead) => {
    try {
      const { client } = await leadsApi.convertToClient(lead.id);
      toast.success(`Converted "${lead.title}" into client account!`);
      loadData();
      router.push(`/admin/crm/clients/${client.id}`);
    } catch {
      toast.error("Failed to convert lead to client");
    }
  };

  // Add Lead
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.title.trim() || !newForm.contact_name.trim()) {
      toast.error("Please fill in opportunity title and contact person.");
      return;
    }

    try {
      await leadsApi.create(newForm);
      toast.success("New lead opportunity registered");
      setShowAddModal(false);
      setNewForm({
        title: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        lead_value: 50000,
        status: "new",
        owner_id: users[0]?.id || "",
        follow_up_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
        notes: "",
      });
      loadData();
    } catch {
      toast.error("Failed to create lead");
    }
  };

  // Edit Lead
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLead) return;
    try {
      await leadsApi.update(editLead.id, editLead);
      toast.success(`Lead "${editLead.title}" updated`);
      setEditLead(null);
      loadData();
    } catch {
      toast.error("Failed to update lead");
    }
  };

  // Delete Lead
  const handleDeleteConfirm = async () => {
    if (!deleteLead) return;
    try {
      await leadsApi.delete(deleteLead.id);
      toast.success("Lead removed");
      setDeleteLead(null);
      loadData();
    } catch {
      toast.error("Failed to delete lead");
    }
  };

  // KPI calculations
  const totalPipelineValue = useMemo(() => {
    return leads
      .filter((l) => l.status !== "lost")
      .reduce((acc, l) => acc + (l.lead_value || 0), 0);
  }, [leads]);

  const wonDealsCount = useMemo(() => {
    return leads.filter((l) => l.status === "won").length;
  }, [leads]);

  // Filtered Leads
  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (stageFilter && l.status !== stageFilter) return false;
      if (ownerFilter && l.owner_id !== ownerFilter) return false;
      return true;
    });
  }, [leads, stageFilter, ownerFilter]);

  // Export
  const exportColumns = [
    { key: "title", header: "Opportunity Title" },
    { key: "contact_name", header: "Contact Person" },
    { key: "contact_email", header: "Email" },
    { key: "contact_phone", header: "Phone" },
    { key: "lead_value", header: "Value (SAR)" },
    { key: "status", header: "Stage" },
    { key: "owner", header: "Owner" },
    { key: "follow_up_date", header: "Next Follow-up" },
  ];

  const exportData = useMemo(() => {
    return filtered.map((l) => ({
      title: l.title,
      contact_name: l.contact_name,
      contact_email: l.contact_email || "",
      contact_phone: l.contact_phone || "",
      lead_value: l.lead_value || 0,
      status: l.status,
      owner: l.owner?.full_name || "Unassigned",
      follow_up_date: l.follow_up_date || "",
    }));
  }, [filtered]);

  // Columns for DataTable
  const columns: ColumnDef<Lead>[] = [
    {
      key: "title",
      header: "Opportunity / Contact",
      sortable: true,
      cell: (row) => (
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{row.title}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{row.contact_name}</span>
            {row.contact_email && (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" /> {row.contact_email}
              </span>
            )}
            {row.contact_phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" /> {row.contact_phone}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "lead_value",
      header: "Est. Value (SAR)",
      sortable: true,
      cell: (row) => (
        <span className="font-bold text-teal-600 dark:text-teal-400">
          SAR {(row.lead_value || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: "status",
      header: "Pipeline Stage",
      sortable: true,
      cell: (row) => {
        const meta = STAGES[row.status] || STAGES.new;
        return (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.style}`}>
            {meta.label}
          </span>
        );
      },
    },
    {
      key: "owner",
      header: "Owner",
      cell: (row) => (
        <span className="text-xs text-foreground font-medium">
          {row.owner?.full_name || "Unassigned"}
        </span>
      ),
    },
    {
      key: "follow_up_date",
      header: "Follow-up",
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.follow_up_date ? new Date(row.follow_up_date).toLocaleDateString() : "None"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1">
          {row.status !== "won" && (
            <button
              type="button"
              onClick={() => handleConvertToClient(row)}
              title="Convert to Active Client"
              className="inline-flex items-center gap-1 rounded bg-teal-600/10 px-2 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-600 hover:text-white transition"
            >
              <ArrowRightCircle className="h-3.5 w-3.5" />
              Convert
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditLead(row)}
            title="Edit Lead"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteLead(row)}
            title="Delete Lead"
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
        title="Leads Pipeline"
        description="Track prospects, forecast pipeline revenue, and convert won deals to clients."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "CRM", href: "/admin/crm/clients" },
          { label: "Leads" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <ExportButton filename="leads_pipeline" columns={exportColumns} data={exportData} />
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 transition"
            >
              <Plus className="h-4 w-4" /> Add Lead
            </button>
          </div>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Total Pipeline Value</span>
          <p className="mt-1 text-2xl font-bold text-foreground">
            SAR {totalPipelineValue.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Active Opportunities</span>
          <p className="mt-1 text-2xl font-bold text-foreground">{leads.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Won Deals</span>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {wonDealsCount} ({Math.round((wonDealsCount / (leads.length || 1)) * 100)}% Win Rate)
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Stage:</label>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none"
          >
            <option value="">All Stages</option>
            {Object.keys(STAGES).map((st) => (
              <option key={st} value={st}>
                {STAGES[st as LeadStatus].label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Owner:</label>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none"
          >
            <option value="">All Owners</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
        </div>

        {(stageFilter || ownerFilter) && (
          <button
            type="button"
            onClick={() => {
              setStageFilter("");
              setOwnerFilter("");
            }}
            className="text-xs text-teal-600 hover:underline ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyTitle="No leads found"
        emptyDescription="Try adjusting your stage/owner filter or create a new lead."
      />

      {/* Add Lead Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-lead-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in">
            <h3 id="add-lead-title" className="text-lg font-semibold text-foreground">Add Opportunity Lead</h3>
            <p className="mt-1 text-xs text-muted-foreground">Record a prospect and assign an account executive.</p>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="new-lead-title" className="text-xs font-medium text-foreground">Opportunity Title *</label>
                <input
                  id="new-lead-title"
                  type="text"
                  required
                  placeholder="e.g. Enterprise Cloud ERP Migration"
                  value={newForm.title}
                  onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                  className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="new-lead-contact" className="text-xs font-medium text-foreground">Contact Person *</label>
                  <input
                    id="new-lead-contact"
                    type="text"
                    required
                    placeholder="e.g. Eng. Salem Al-Harthi"
                    value={newForm.contact_name}
                    onChange={(e) => setNewForm({ ...newForm, contact_name: e.target.value })}
                    className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="new-lead-value" className="text-xs font-medium text-foreground">Est. Value (SAR)</label>
                  <input
                    id="new-lead-value"
                    type="number"
                    value={newForm.lead_value}
                    onChange={(e) => setNewForm({ ...newForm, lead_value: Number(e.target.value) })}
                    className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="new-lead-email" className="text-xs font-medium text-foreground">Email</label>
                  <input
                    id="new-lead-email"
                    type="email"
                    placeholder="salem@client.com"
                    value={newForm.contact_email}
                    onChange={(e) => setNewForm({ ...newForm, contact_email: e.target.value })}
                    className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="new-lead-phone" className="text-xs font-medium text-foreground">Phone</label>
                  <input
                    id="new-lead-phone"
                    type="text"
                    placeholder="+966 50 123 4567"
                    value={newForm.contact_phone}
                    onChange={(e) => setNewForm({ ...newForm, contact_phone: e.target.value })}
                    className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="new-lead-status" className="text-xs font-medium text-foreground">Pipeline Stage</label>
                  <select
                    id="new-lead-status"
                    value={newForm.status}
                    onChange={(e) => setNewForm({ ...newForm, status: e.target.value as LeadStatus })}
                    className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  >
                    {Object.keys(STAGES).map((st) => (
                      <option key={st} value={st}>
                        {STAGES[st as LeadStatus].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="new-lead-owner" className="text-xs font-medium text-foreground">Owner</label>
                  <select
                    id="new-lead-owner"
                    value={newForm.owner_id}
                    onChange={(e) => setNewForm({ ...newForm, owner_id: e.target.value })}
                    className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="new-lead-followup" className="text-xs font-medium text-foreground">Next Follow-up Date</label>
                <input
                  id="new-lead-followup"
                  type="date"
                  value={newForm.follow_up_date}
                  onChange={(e) => setNewForm({ ...newForm, follow_up_date: e.target.value })}
                  className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
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
                  Create Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {editLead && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-lead-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in">
            <h3 id="edit-lead-title" className="text-lg font-semibold text-foreground">Edit Opportunity Lead</h3>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="edit-lead-title-input" className="text-xs font-medium text-foreground">Opportunity Title</label>
                <input
                  id="edit-lead-title-input"
                  type="text"
                  required
                  value={editLead.title}
                  onChange={(e) => setEditLead({ ...editLead, title: e.target.value })}
                  className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-lead-contact-input" className="text-xs font-medium text-foreground">Contact Person</label>
                  <input
                    id="edit-lead-contact-input"
                    type="text"
                    required
                    value={editLead.contact_name}
                    onChange={(e) => setEditLead({ ...editLead, contact_name: e.target.value })}
                    className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="edit-lead-value-input" className="text-xs font-medium text-foreground">Est. Value (SAR)</label>
                  <input
                    id="edit-lead-value-input"
                    type="number"
                    value={editLead.lead_value}
                    onChange={(e) => setEditLead({ ...editLead, lead_value: Number(e.target.value) })}
                    className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-lead-stage-input" className="text-xs font-medium text-foreground">Pipeline Stage</label>
                  <select
                    id="edit-lead-stage-input"
                    value={editLead.status}
                    onChange={(e) => setEditLead({ ...editLead, status: e.target.value as LeadStatus })}
                    className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  >
                    {Object.keys(STAGES).map((st) => (
                      <option key={st} value={st}>
                        {STAGES[st as LeadStatus].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-lead-owner-input" className="text-xs font-medium text-foreground">Owner</label>
                  <select
                    id="edit-lead-owner-input"
                    value={editLead.owner_id || ""}
                    onChange={(e) => setEditLead({ ...editLead, owner_id: e.target.value })}
                    className="mt-1 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditLead(null)}
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

      {/* Delete Lead Modal */}
      {deleteLead && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-lead-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in">
            <h3 id="delete-lead-title" className="text-lg font-semibold text-foreground">Delete Opportunity</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to remove <span className="font-semibold text-foreground">{deleteLead.title}</span>?
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteLead(null)}
                className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                Delete Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
