/**
 * app/(employee)/employee/leave/page.tsx
 *
 * Leave Management — View leave quotas, submit time-off requests,
 * and track manager approval statuses.
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Palmtree,
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentEmployee } from "@/lib/permissions/employee";
import { leaveRequestsApi, type LeaveRequest } from "@/lib/api";

export default function LeaveManagementPage() {
  const { employee } = useCurrentEmployee();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply leave modal
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveRequest["leave_type"]>("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadLeaves() {
      setLoading(true);
      try {
        const empLeaves = await leaveRequestsApi.getAll({ employeeId: employee.employeeId });
        setLeaves(empLeaves);
      } catch (err) {
        console.error("Failed to load leaves:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLeaves();
  }, [employee.employeeId]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error("Please specify both start date and end date");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date cannot be after end date");
      return;
    }

    setSubmitting(true);
    try {
      const created = await leaveRequestsApi.create({
        employee_id: employee.employeeId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || "Personal time off",
        status: "pending",
      });

      setLeaves((prev) => [created, ...prev]);
      setIsApplyModalOpen(false);
      setReason("");
      setStartDate("");
      setEndDate("");
      toast.success("Leave application submitted for approval!");
    } catch {
      toast.error("Failed to submit leave application");
    } finally {
      setSubmitting(false);
    }
  };

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Palmtree className="h-6 w-6 text-sky-400" />
            Leave Management & Time Off
          </h1>
          <p className="text-sm text-muted-foreground">
            Track remaining vacation allowances, apply for leave, and view approval status
          </p>
        </div>

        <button
          onClick={() => setIsApplyModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Apply for Leave
        </button>
      </div>

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Annual Leave */}
        <div className="rounded-xl border border-sky-500/20 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Annual Vacation</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
              <Palmtree className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">18</span>
            <span className="text-xs text-muted-foreground">/ 24 days remaining</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-sky-500 rounded-full" style={{ width: "75%" }} />
          </div>
        </div>

        {/* Sick Leave */}
        <div className="rounded-xl border border-emerald-500/20 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sick Leave</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">8</span>
            <span className="text-xs text-muted-foreground">/ 10 days remaining</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: "80%" }} />
          </div>
        </div>

        {/* Emergency Leave */}
        <div className="rounded-xl border border-amber-500/20 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Casual / Emergency</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">3</span>
            <span className="text-xs text-muted-foreground">/ 5 days remaining</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: "60%" }} />
          </div>
        </div>
      </div>

      {/* Main Table: Leave Requests History */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Leave Application History</h2>
            <p className="text-xs text-muted-foreground">History of submitted requests, date ranges, and approval statuses</p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {leaves.length} Applications
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading leave history...</div>
        ) : leaves.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No leave requests recorded yet. Click &quot;Apply for Leave&quot; above to submit one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">Leave Type</th>
                  <th className="px-6 py-3">Dates</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Submission Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {leaves.map((item) => {
                  const days = calculateDays(item.start_date, item.end_date);
                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-semibold capitalize text-foreground">
                        {item.leave_type} Leave
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                        {item.start_date} <span className="text-foreground">→</span> {item.end_date}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-foreground">
                        {days} {days === 1 ? "day" : "days"}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground max-w-xs truncate">
                        {item.reason}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                            item.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : item.status === "rejected"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {item.status === "approved" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : item.status === "rejected" ? (
                            <XCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          <span className="capitalize">{item.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2026 Company Holidays reference */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-sky-400" />
          Upcoming Public & Company Holidays (2026)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <p className="font-semibold text-foreground">Saudi Founding Day</p>
            <p className="text-muted-foreground mt-0.5">February 22, 2026 • 1 Day</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <p className="font-semibold text-foreground">Eid Al-Fitr Holiday</p>
            <p className="text-muted-foreground mt-0.5">March 20 - March 24, 2026 • 5 Days</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <p className="font-semibold text-foreground">Saudi National Day</p>
            <p className="text-muted-foreground mt-0.5">September 23, 2026 • 1 Day</p>
          </div>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Apply for Leave</h3>
                <p className="text-xs text-muted-foreground">Submit a time-off request to your department lead</p>
              </div>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Leave Type *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveRequest["leave_type"])}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-sky-500 focus:outline-none cursor-pointer"
                >
                  <option value="annual">Annual Leave (Vacation)</option>
                  <option value="sick">Sick Leave</option>
                  <option value="emergency">Emergency / Casual Leave</option>
                  <option value="paternity">Paternity Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Reason & Coverage Details *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Reason for leave and details of tasks handed over..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
