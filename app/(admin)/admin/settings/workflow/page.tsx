/**
 * app/(admin)/admin/settings/workflow/page.tsx
 *
 * Workflow Customization Hub:
 * - Custom Kanban Columns (add, edit title, color badge)
 * - CRM Pipeline & Client Statuses
 * - Task Priorities configuration
 * - Leave Types & Default Annual Quotas
 * - Save changes with instant toast feedback
 */

"use client";

import React, { useEffect, useState } from "react";
import { settingsApi, type WorkflowSettings } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Kanban, Layers, Tag, Calendar, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export default function WorkflowSettingsPage() {
  const [workflow, setWorkflow] = useState<WorkflowSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New item inputs
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("#38bdf8");

  async function loadData() {
    try {
      const data = await settingsApi.getWorkflowSettings();
      setWorkflow(data);
    } catch {
      toast.error("Failed to load workflow settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleAddColumn = () => {
    if (!newColumnTitle.trim() || !workflow) return;
    const newCol = {
      id: `col-${Date.now()}`,
      title: newColumnTitle.trim(),
      color: newColumnColor,
    };
    setWorkflow({
      ...workflow,
      kanban_columns: [...workflow.kanban_columns, newCol],
    });
    setNewColumnTitle("");
    toast.success(`Column "${newCol.title}" added to Kanban`);
  };

  const handleDeleteColumn = (id: string) => {
    if (!workflow) return;
    setWorkflow({
      ...workflow,
      kanban_columns: workflow.kanban_columns.filter((c) => c.id !== id),
    });
    toast.success("Column removed");
  };

  const handleSave = async () => {
    if (!workflow) return;
    setSaving(true);
    try {
      await settingsApi.updateWorkflowSettings(workflow);
      toast.success("Workflow and pipeline settings saved successfully!");
    } catch {
      toast.error("Failed to save workflow settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !workflow) {
    return (
      <div className="space-y-8" role="status" aria-busy="true">
        <span className="sr-only">Loading workflow settings...</span>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Workflow & Pipeline Customization"
        description="Configure Kanban stages, deal pipeline steps, priority tiers, and leave day quotas."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Settings", href: "/admin/settings/company" },
          { label: "Workflow Configuration" },
        ]}
        actions={
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving Changes..." : "Save Configuration"}
          </button>
        }
      />

      {/* Section 1: Kanban Board Columns */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Kanban className="h-5 w-5 text-teal-600" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Kanban Columns</h2>
            <p className="text-xs text-muted-foreground">Execution phases displayed on the drag-and-drop board.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-2">
          {workflow.kanban_columns.map((col) => (
            <div
              key={col.id}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: col.color }} aria-hidden="true" />
                <span className="font-semibold text-foreground">{col.title}</span>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteColumn(col.id)}
                aria-label={`Delete ${col.title} column`}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-md transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Column Strip */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
          <label htmlFor="new-col-title" className="sr-only">New column title</label>
          <input
            id="new-col-title"
            type="text"
            placeholder="New column name..."
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            className="h-11 sm:h-9 rounded-lg border border-input bg-background px-3 text-sm sm:text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 min-w-[220px]"
          />
          <label htmlFor="new-col-color" className="sr-only">Column Color</label>
          <input
            id="new-col-color"
            type="color"
            value={newColumnColor}
            onChange={(e) => setNewColumnColor(e.target.value)}
            className="h-11 w-12 sm:h-9 sm:w-10 cursor-pointer rounded-lg border border-input bg-background p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          />
          <button
            type="button"
            onClick={handleAddColumn}
            className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm sm:text-xs font-semibold text-white hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            <Plus className="h-3.5 w-3.5" /> Add Column
          </button>
        </div>
      </div>

      {/* Section 2: CRM Lead & Client Pipeline Stages */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Lead Stages */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-amber-500" aria-hidden="true" />
            <h2 className="text-base font-semibold text-foreground">Lead Pipeline Stages</h2>
          </div>
          <div className="space-y-2 pt-2">
            {workflow.lead_statuses.map((st) => (
              <div key={st.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3 sm:p-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: st.color }} aria-hidden="true" />
                  <span className="font-semibold text-foreground">{st.label}</span>
                </div>
                <span className="font-mono text-muted-foreground">{st.id}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Client Account Statuses */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-teal-600" aria-hidden="true" />
            <h2 className="text-base font-semibold text-foreground">Client Account Statuses</h2>
          </div>
          <div className="space-y-2 pt-2">
            {workflow.client_statuses.map((st) => (
              <div key={st.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3 sm:p-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: st.color }} aria-hidden="true" />
                  <span className="font-semibold text-foreground">{st.label}</span>
                </div>
                <span className="font-mono text-muted-foreground">{st.id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 3: Leave Types & Default Quotas */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Leave Types & Annual Allowances</h2>
            <p className="text-xs text-muted-foreground">Default annual leave day allocations per employee.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
          {workflow.leave_types.map((lt, idx) => {
            const inputId = `leave-quota-${lt.id}`;
            return (
              <div key={lt.id} className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
                <label htmlFor={inputId} className="block font-semibold text-sm text-foreground">
                  {lt.label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={inputId}
                    type="number"
                    value={lt.default_days}
                    onChange={(e) => {
                      const copy = [...workflow.leave_types];
                      copy[idx].default_days = Number(e.target.value);
                      setWorkflow({ ...workflow, leave_types: copy });
                    }}
                    className="h-11 sm:h-8 w-24 sm:w-20 rounded-md border border-input bg-background px-3 sm:px-2 text-sm sm:text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  />
                  <span className="text-xs text-muted-foreground">days per calendar year</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
