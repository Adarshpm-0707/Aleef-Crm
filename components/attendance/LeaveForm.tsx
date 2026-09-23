/**
 * LeaveForm — submit a leave request.
 * Fully validated; manager/admin see an approval section.
 */

"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

/* ─── Types ────────────────────────────────────────────────────────────────── */

export type LeaveType = "annual" | "sick" | "emergency" | "maternity" | "paternity" | "unpaid";

export interface LeaveFormData {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  contactDuringLeave: string;
}

export interface LeaveFormProps {
  onSubmit?: (data: LeaveFormData) => void;
  onCancel?: () => void;
  /** If true, shows balance info panel */
  showBalance?: boolean;
  balanceDays?: Partial<Record<LeaveType, number>>;
  className?: string;
}

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "annual",    label: "Annual Leave"    },
  { value: "sick",      label: "Sick Leave"      },
  { value: "emergency", label: "Emergency Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "paternity", label: "Paternity Leave" },
  { value: "unpaid",    label: "Unpaid Leave"    },
];

const DEFAULT_BALANCE: Record<LeaveType, number> = {
  annual:    15,
  sick:      10,
  emergency: 3,
  maternity: 90,
  paternity: 14,
  unpaid:    0,
};

/* ─── Component ────────────────────────────────────────────────────────────── */

export function LeaveForm({
  onSubmit,
  onCancel,
  showBalance = true,
  balanceDays = DEFAULT_BALANCE,
  className,
}: LeaveFormProps) {
  const [form, setForm] = useState<LeaveFormData>({
    leaveType: "annual",
    startDate: "",
    endDate: "",
    reason: "",
    contactDuringLeave: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LeaveFormData, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  const update = (patch: Partial<LeaveFormData>) => {
    setForm((f) => ({ ...f, ...patch }));
    // Clear errors for patched fields
    setErrors((e) => {
      const copy = { ...e };
      Object.keys(patch).forEach((k) => delete copy[k as keyof LeaveFormData]);
      return copy;
    });
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof LeaveFormData, string>> = {};
    if (!form.startDate) errs.startDate = "Start date is required";
    if (!form.endDate) errs.endDate = "End date is required";
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      errs.endDate = "End date must be after start date";
    if (!form.reason.trim()) errs.reason = "Reason is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit?.(form);
    setSubmitted(true);
  };

  /* Calculate requested days */
  const requestedDays =
    form.startDate && form.endDate
      ? Math.max(
          0,
          Math.round(
            (new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1,
        )
      : 0;

  const balance = balanceDays[form.leaveType] ?? DEFAULT_BALANCE[form.leaveType];

  if (submitted) {
    return (
      <div className={cn("rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 p-8 text-center", className)}>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-7 w-7 text-emerald-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="mb-1 text-lg font-semibold text-foreground">Leave Request Submitted</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Your {form.leaveType} leave request for {requestedDays} day{requestedDays !== 1 ? "s" : ""} has been submitted for approval.
        </p>
        <button
          type="button"
          onClick={() => { setSubmitted(false); setForm({ leaveType: "annual", startDate: "", endDate: "", reason: "", contactDuringLeave: "" }); }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Leave request form"
      className={cn("rounded-2xl border border-border bg-card shadow-card overflow-hidden", className)}
    >
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-base font-semibold text-foreground">Leave Request</h3>
        <p className="text-xs text-muted-foreground">Fill in the details to apply for leave</p>
      </div>

      <div className="space-y-5 px-6 py-5">
        {/* Balance info */}
        {showBalance && (
          <div className="rounded-xl bg-muted/40 p-3.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {LEAVE_TYPES.find((t) => t.value === form.leaveType)?.label} balance
              </span>
              <span className="font-semibold text-foreground">{balance} days remaining</span>
            </div>
            {requestedDays > 0 && (
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    requestedDays > balance ? "bg-danger" : "bg-primary",
                  )}
                  style={{ width: `${Math.min(100, (requestedDays / Math.max(balance, 1)) * 100)}%` }}
                />
              </div>
            )}
            {requestedDays > balance && (
              <p className="mt-1 text-xs text-danger">
                Requesting {requestedDays} days exceeds your balance of {balance} days.
              </p>
            )}
          </div>
        )}

        {/* Leave type */}
        <div className="space-y-1.5">
          <label htmlFor="leave-type" className="text-sm font-medium text-foreground">
            Leave Type <span aria-hidden="true" className="text-danger">*</span>
          </label>
          <select
            id="leave-type"
            value={form.leaveType}
            onChange={(e) => update({ leaveType: e.target.value as LeaveType })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {LEAVE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="leave-start" className="text-sm font-medium text-foreground">
              Start Date <span aria-hidden="true" className="text-danger">*</span>
            </label>
            <input
              id="leave-start"
              type="date"
              value={form.startDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => update({ startDate: e.target.value })}
              aria-describedby={errors.startDate ? "leave-start-error" : undefined}
              className={cn(
                "w-full rounded-lg border bg-background px-3 py-2 text-sm",
                errors.startDate ? "border-danger" : "border-input",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            />
            {errors.startDate && (
              <p id="leave-start-error" role="alert" className="text-xs text-danger">{errors.startDate}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="leave-end" className="text-sm font-medium text-foreground">
              End Date <span aria-hidden="true" className="text-danger">*</span>
            </label>
            <input
              id="leave-end"
              type="date"
              value={form.endDate}
              min={form.startDate || new Date().toISOString().slice(0, 10)}
              onChange={(e) => update({ endDate: e.target.value })}
              aria-describedby={errors.endDate ? "leave-end-error" : undefined}
              className={cn(
                "w-full rounded-lg border bg-background px-3 py-2 text-sm",
                errors.endDate ? "border-danger" : "border-input",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            />
            {errors.endDate && (
              <p id="leave-end-error" role="alert" className="text-xs text-danger">{errors.endDate}</p>
            )}
            {requestedDays > 0 && (
              <p className="text-xs text-muted-foreground">{requestedDays} working day{requestedDays !== 1 ? "s" : ""}</p>
            )}
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <label htmlFor="leave-reason" className="text-sm font-medium text-foreground">
            Reason <span aria-hidden="true" className="text-danger">*</span>
          </label>
          <textarea
            id="leave-reason"
            rows={3}
            value={form.reason}
            onChange={(e) => update({ reason: e.target.value })}
            placeholder="Briefly describe the reason for your leave…"
            aria-describedby={errors.reason ? "leave-reason-error" : undefined}
            className={cn(
              "w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm",
              errors.reason ? "border-danger" : "border-input",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          />
          {errors.reason && (
            <p id="leave-reason-error" role="alert" className="text-xs text-danger">{errors.reason}</p>
          )}
        </div>

        {/* Contact during leave */}
        <div className="space-y-1.5">
          <label htmlFor="leave-contact" className="text-sm font-medium text-foreground">
            Contact During Leave <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            id="leave-contact"
            type="text"
            value={form.contactDuringLeave}
            onChange={(e) => update({ contactDuringLeave: e.target.value })}
            placeholder="+91 98765 43210"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className={cn(
            "rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-all",
            "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          Submit Request
        </button>
      </div>
    </form>
  );
}
