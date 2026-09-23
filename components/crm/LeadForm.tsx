/**
 * LeadForm — create or edit a CRM lead.
 * Tracks lead source, stage (pipeline), assigned rep, estimated value.
 */

"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

/* ─── Types ────────────────────────────────────────────────────────────────── */

export type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type LeadSource =
  | "website"
  | "referral"
  | "cold-call"
  | "social-media"
  | "event"
  | "other";

export interface Lead {
  id?: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  stage: LeadStage;
  source: LeadSource;
  estimatedValue?: number;
  assignedTo?: string;
  notes?: string;
  followUpDate?: string;
}

export interface LeadFormProps {
  lead?: Lead;
  assignees?: { id: string; name: string }[];
  onSubmit?: (lead: Lead) => void;
  onCancel?: () => void;
  className?: string;
}

/* ─── Options ───────────────────────────────────────────────────────────────── */

const STAGES: { value: LeadStage; label: string; color: string }[] = [
  { value: "new",         label: "New",         color: "bg-slate-400" },
  { value: "contacted",   label: "Contacted",   color: "bg-blue-400" },
  { value: "qualified",   label: "Qualified",   color: "bg-amber-400" },
  { value: "proposal",    label: "Proposal",    color: "bg-purple-400" },
  { value: "negotiation", label: "Negotiation", color: "bg-orange-400" },
  { value: "won",         label: "Won",         color: "bg-emerald-400" },
  { value: "lost",        label: "Lost",        color: "bg-rose-400" },
];

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: "website",      label: "Website"      },
  { value: "referral",     label: "Referral"     },
  { value: "cold-call",    label: "Cold Call"    },
  { value: "social-media", label: "Social Media" },
  { value: "event",        label: "Event"        },
  { value: "other",        label: "Other"        },
];

/* ─── Component ────────────────────────────────────────────────────────────── */

const EMPTY: Lead = {
  name: "", email: "", stage: "new", source: "website",
};

export function LeadForm({ lead, assignees = [], onSubmit, onCancel, className }: LeadFormProps) {
  const [form, setForm] = useState<Lead>(lead ?? EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Lead, string>>>({});
  const isEdit = !!lead?.id;

  useEffect(() => {
    setForm(lead ?? EMPTY);
    setErrors({});
  }, [lead]);

  const update = (patch: Partial<Lead>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const c = { ...e };
      Object.keys(patch).forEach((k) => delete c[k as keyof Lead]);
      return c;
    });
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof Lead, string>> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit?.({ ...form, id: form.id ?? crypto.randomUUID() });
  };

  /* Pipeline stage progress */
  const stageIdx = STAGES.findIndex((s) => s.value === form.stage);
  const progressPct = Math.round(((stageIdx + 1) / STAGES.length) * 100);

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={isEdit ? "Edit lead form" : "New lead form"}
      className={cn("rounded-2xl border border-border bg-card shadow-card overflow-hidden", className)}
    >
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-base font-semibold text-foreground">{isEdit ? "Edit Lead" : "New Lead"}</h3>

        {/* Pipeline progress */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Pipeline stage</span>
            <span className="font-medium text-foreground capitalize">{form.stage.replace("-", " ")}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className={cn("h-full rounded-full transition-all duration-500", STAGES[stageIdx]?.color ?? "bg-primary")}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between">
            {STAGES.map((s, i) => (
              <button
                key={s.value}
                type="button"
                onClick={() => update({ stage: s.value })}
                title={s.label}
                aria-label={`Set stage to ${s.label}`}
                aria-pressed={form.stage === s.value}
                className={cn(
                  "h-2 flex-1 rounded-full transition-all",
                  i === 0 && "rounded-l-full",
                  i === STAGES.length - 1 && "rounded-r-full",
                  i <= stageIdx ? s.color : "bg-transparent",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-5 px-6 py-5">
        {/* Name + Company */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="lead-name" className="text-sm font-medium text-foreground">
              Name <span aria-hidden="true" className="text-danger">*</span>
            </label>
            <input
              id="lead-name"
              type="text"
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Full name"
              aria-describedby={errors.name ? "lead-name-error" : undefined}
              className={cn(
                "w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground",
                errors.name ? "border-danger" : "border-input",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            />
            {errors.name && <p id="lead-name-error" role="alert" className="text-xs text-danger">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="lead-company" className="text-sm font-medium text-foreground">Company</label>
            <input
              id="lead-company"
              type="text"
              value={form.company ?? ""}
              onChange={(e) => update({ company: e.target.value })}
              placeholder="Company name"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Email + Phone */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="lead-email" className="text-sm font-medium text-foreground">
              Email <span aria-hidden="true" className="text-danger">*</span>
            </label>
            <input
              id="lead-email"
              type="email"
              value={form.email}
              onChange={(e) => update({ email: e.target.value })}
              placeholder="email@example.com"
              aria-describedby={errors.email ? "lead-email-error" : undefined}
              className={cn(
                "w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground",
                errors.email ? "border-danger" : "border-input",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            />
            {errors.email && <p id="lead-email-error" role="alert" className="text-xs text-danger">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="lead-phone" className="text-sm font-medium text-foreground">Phone</label>
            <input
              id="lead-phone"
              type="tel"
              value={form.phone ?? ""}
              onChange={(e) => update({ phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Stage + Source */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="lead-stage" className="text-sm font-medium text-foreground">Stage</label>
            <select
              id="lead-stage"
              value={form.stage}
              onChange={(e) => update({ stage: e.target.value as LeadStage })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="lead-source" className="text-sm font-medium text-foreground">Source</label>
            <select
              id="lead-source"
              value={form.source}
              onChange={(e) => update({ source: e.target.value as LeadSource })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Value + Assignee */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="lead-value" className="text-sm font-medium text-foreground">Estimated Value ($)</label>
            <input
              id="lead-value"
              type="number"
              min={0}
              step={100}
              value={form.estimatedValue ?? ""}
              onChange={(e) => update({ estimatedValue: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="5000"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {assignees.length > 0 && (
            <div className="space-y-1.5">
              <label htmlFor="lead-assignee" className="text-sm font-medium text-foreground">Assigned To</label>
              <select
                id="lead-assignee"
                value={form.assignedTo ?? ""}
                onChange={(e) => update({ assignedTo: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Unassigned</option>
                {assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Follow-up date */}
        <div className="space-y-1.5">
          <label htmlFor="lead-followup" className="text-sm font-medium text-foreground">Follow-up Date</label>
          <input
            id="lead-followup"
            type="date"
            value={form.followUpDate ?? ""}
            onChange={(e) => update({ followUpDate: e.target.value })}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label htmlFor="lead-notes" className="text-sm font-medium text-foreground">Notes</label>
          <textarea
            id="lead-notes"
            rows={3}
            value={form.notes ?? ""}
            onChange={(e) => update({ notes: e.target.value })}
            placeholder="Additional notes…"
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isEdit ? "Save changes" : "Create Lead"}
        </button>
      </div>
    </form>
  );
}
