/**
 * app/(admin)/admin/projects/page.tsx
 *
 * Full Project Management:
 * - Project list & grid views
 * - Client linking, progress bars, start/end dates
 * - Add project modal, edit, delete
 * - Filter by Client, Status, Search
 * - Link to Kanban board
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  projectsApi,
  clientsApi,
  type Project,
  type Client,
  type ProjectStatus,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type ColumnDef } from "@/components/shared/DataTable";
import { ExportButton } from "@/components/shared/ExportButton";
import {
  Plus,
  Edit2,
  Trash2,
  Kanban,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<ProjectStatus, { label: string; style: string }> = {
  planning: { label: "Planning", style: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
  active: { label: "Active", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  on_hold: { label: "On Hold", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  completed: { label: "Completed", style: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  cancelled: { label: "Cancelled", style: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
};

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [clientFilter, setClientFilter] = useState<string>("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);

  const [newForm, setNewForm] = useState({
    name: "",
    client_id: "",
    status: "planning" as ProjectStatus,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 86400000 * 60).toISOString().slice(0, 10),
    progress: 10,
    description: "",
  });

  const loadData = useCallback(async () => {
    try {
      const [pList, cList] = await Promise.all([
        projectsApi.getAll(),
        clientsApi.getAll(),
      ]);
      setProjects(pList);
      setClients(cList);
      if (cList.length > 0 && !newForm.client_id) {
        setNewForm((prev) => ({ ...prev, client_id: cList[0].id }));
      }
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [newForm.client_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Escape key for all modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showAddModal) setShowAddModal(false);
        if (editProject) setEditProject(null);
        if (deleteProject) setDeleteProject(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddModal, editProject, deleteProject]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name.trim() || !newForm.client_id) {
      toast.error("Please fill in project name and select a client.");
      return;
    }

    try {
      await projectsApi.create(newForm);
      toast.success(`Project "${newForm.name}" created`);
      setShowAddModal(false);
      setNewForm({
        name: "",
        client_id: clients[0]?.id || "",
        status: "planning",
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(Date.now() + 86400000 * 60).toISOString().slice(0, 10),
        progress: 10,
        description: "",
      });
      loadData();
    } catch {
      toast.error("Failed to create project");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProject) return;

    try {
      await projectsApi.update(editProject.id, editProject);
      toast.success(`Project "${editProject.name}" updated`);
      setEditProject(null);
      loadData();
    } catch {
      toast.error("Failed to update project");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteProject) return;
    try {
      await projectsApi.delete(deleteProject.id);
      toast.success("Project removed");
      setDeleteProject(null);
      loadData();
    } catch {
      toast.error("Failed to delete project");
    }
  };

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (clientFilter && p.client_id !== clientFilter) return false;
      return true;
    });
  }, [projects, statusFilter, clientFilter]);

  const exportColumns = [
    { key: "name", header: "Project Name" },
    { key: "client_name", header: "Client" },
    { key: "status", header: "Status" },
    { key: "progress", header: "Progress (%)" },
    { key: "start_date", header: "Start Date" },
    { key: "end_date", header: "End Date" },
  ];

  const exportData = useMemo(() => {
    return filtered.map((p) => ({
      name: p.name,
      client_name: p.client?.company_name || "",
      status: p.status,
      progress: p.progress || 0,
      start_date: p.start_date || "",
      end_date: p.end_date || "",
    }));
  }, [filtered]);

  const columns: ColumnDef<Project>[] = [
    {
      key: "name",
      header: "Project / Client",
      sortable: true,
      cell: (row) => (
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">
            Client: <span className="font-medium text-foreground">{row.client?.company_name}</span>
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (row) => {
        const meta = STATUS_CONFIG[row.status] || STATUS_CONFIG.planning;
        return (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.style}`}>
            {meta.label}
          </span>
        );
      },
    },
    {
      key: "progress",
      header: "Progress",
      sortable: true,
      cell: (row) => (
        <div className="w-32 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{row.progress || 0}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={row.progress || 0} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress for ${row.name}`}>
            <div className="h-full bg-teal-500 rounded-full" style={{ width: `${row.progress || 0}%` }} />
          </div>
        </div>
      ),
    },
    {
      key: "timeline",
      header: "Timeline",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.start_date} &rarr; {row.end_date || "Ongoing"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/admin/projects/kanban?project=${row.id}`}
            title="Kanban Board"
            aria-label={`Open Kanban board for ${row.name}`}
            className="flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded p-2 sm:p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Kanban className="h-4 w-4 text-teal-600" />
          </Link>
          <button
            type="button"
            onClick={() => setEditProject(row)}
            title="Edit Project"
            aria-label={`Edit ${row.name}`}
            className="flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded p-2 sm:p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteProject(row)}
            title="Delete Project"
            aria-label={`Delete ${row.name}`}
            className="flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded p-2 sm:p-1.5 text-rose-500 hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        title="Projects Portfolio"
        description="Monitor client deliverables, delivery timelines, milestones, and task progress."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Projects", href: "/admin/projects" },
          { label: "Portfolio" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButton filename="projects_portfolio" columns={exportColumns} data={exportData} />
            <Link
              href="/admin/projects/kanban"
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Kanban className="h-4 w-4 text-teal-600" aria-hidden="true" /> Kanban Board
            </Link>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add Project
            </button>
          </div>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Active Projects</span>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {projects.filter((p) => p.status === "active").length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">In Planning</span>
          <p className="mt-1 text-2xl font-bold text-slate-600">
            {projects.filter((p) => p.status === "planning").length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">On Hold</span>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {projects.filter((p) => p.status === "on_hold").length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Completed Deliverables</span>
          <p className="mt-1 text-2xl font-bold text-blue-600">
            {projects.filter((p) => p.status === "completed").length}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <label htmlFor="client-filter" className="text-xs font-medium text-muted-foreground">Client:</label>
          <select
            id="client-filter"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="min-h-[44px] sm:min-h-8 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <label htmlFor="status-filter" className="text-xs font-medium text-muted-foreground">Status:</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-[44px] sm:min-h-8 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Statuses</option>
            {Object.keys(STATUS_CONFIG).map((st) => (
              <option key={st} value={st}>
                {STATUS_CONFIG[st as ProjectStatus].label}
              </option>
            ))}
          </select>
        </div>

        {(clientFilter || statusFilter) && (
          <button
            type="button"
            onClick={() => {
              setClientFilter("");
              setStatusFilter("");
            }}
            className="min-h-[44px] sm:min-h-0 inline-flex items-center text-xs text-teal-600 hover:underline sm:ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* DataTable with Skeleton Loading */}
      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyTitle="No projects found"
        emptyDescription="Create a project to start planning client milestones."
      />

      {/* Add Project Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-project-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in">
            <h3 id="add-project-title" className="text-lg font-semibold text-foreground">Add New Project</h3>
            <p className="mt-1 text-xs text-muted-foreground">Register project deliverables and link to a client account.</p>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="add-proj-name" className="text-xs font-medium text-foreground">Project Name *</label>
                <input
                  id="add-proj-name"
                  type="text"
                  required
                  aria-required="true"
                  placeholder="e.g. Automated Dispatch Optimization"
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                  className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="add-proj-client" className="text-xs font-medium text-foreground">Client *</label>
                  <select
                    id="add-proj-client"
                    required
                    aria-required="true"
                    value={newForm.client_id}
                    onChange={(e) => setNewForm({ ...newForm, client_id: e.target.value })}
                    className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="add-proj-status" className="text-xs font-medium text-foreground">Status</label>
                  <select
                    id="add-proj-status"
                    value={newForm.status}
                    onChange={(e) => setNewForm({ ...newForm, status: e.target.value as ProjectStatus })}
                    className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {Object.keys(STATUS_CONFIG).map((st) => (
                      <option key={st} value={st}>
                        {STATUS_CONFIG[st as ProjectStatus].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="add-proj-start" className="text-xs font-medium text-foreground">Start Date</label>
                  <input
                    id="add-proj-start"
                    type="date"
                    value={newForm.start_date}
                    onChange={(e) => setNewForm({ ...newForm, start_date: e.target.value })}
                    className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="add-proj-end" className="text-xs font-medium text-foreground">Estimated Completion</label>
                  <input
                    id="add-proj-end"
                    type="date"
                    value={newForm.end_date}
                    onChange={(e) => setNewForm({ ...newForm, end_date: e.target.value })}
                    className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="add-proj-desc" className="text-xs font-medium text-foreground">Description & Scope</label>
                <textarea
                  id="add-proj-desc"
                  rows={3}
                  placeholder="Outline key deliverables, technical stack, or deliverables..."
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="min-h-[44px] sm:min-h-0 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] sm:min-h-0 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editProject && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-project-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in">
            <h3 id="edit-project-title" className="text-lg font-semibold text-foreground">Edit Project</h3>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="edit-proj-name" className="text-xs font-medium text-foreground">Project Name</label>
                <input
                  id="edit-proj-name"
                  type="text"
                  required
                  aria-required="true"
                  value={editProject.name}
                  onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                  className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-proj-status" className="text-xs font-medium text-foreground">Status</label>
                  <select
                    id="edit-proj-status"
                    value={editProject.status}
                    onChange={(e) => setEditProject({ ...editProject, status: e.target.value as ProjectStatus })}
                    className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {Object.keys(STATUS_CONFIG).map((st) => (
                      <option key={st} value={st}>
                        {STATUS_CONFIG[st as ProjectStatus].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-proj-progress" className="text-xs font-medium text-foreground">Progress Percentage ({editProject.progress || 0}%)</label>
                  <input
                    id="edit-proj-progress"
                    type="range"
                    min="0"
                    max="100"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={editProject.progress || 0}
                    value={editProject.progress || 0}
                    onChange={(e) => setEditProject({ ...editProject, progress: Number(e.target.value) })}
                    className="mt-3 w-full accent-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditProject(null)}
                  className="min-h-[44px] sm:min-h-0 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] sm:min-h-0 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteProject && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-project-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in">
            <h3 id="delete-project-title" className="text-lg font-semibold text-foreground">Delete Project</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to remove <span className="font-semibold text-foreground">{deleteProject.name}</span>?
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteProject(null)}
                className="min-h-[44px] sm:min-h-0 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="min-h-[44px] sm:min-h-0 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
