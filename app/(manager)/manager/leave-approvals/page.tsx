/**
 * app/(manager)/manager/leave-approvals/page.tsx
 *
 * Scoped Leave Approvals Queue for Managers:
 * - View leave requests submitted by manager's team members
 * - Filter by status (pending, approved, rejected, all)
 * - Approve or reject leave applications with instant toast confirmation
 * - Leave balance preview and team scheduling overview
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  leaveRequestsApi,
  employeesApi,
  type LeaveRequest,
  type Employee,
} from "@/lib/api";
import {
  useCurrentManager,
  filterEmployeesForManager,
  filterLeaveRequestsForManager,
} from "@/lib/permissions/manager";
import { PageHeader } from "@/components/shared/PageHeader";
import { CardSkeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";

export default function ManagerLeaveApprovalsPage() {
  const { manager } = useCurrentManager();
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  // Reject Modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Escape listener for reject modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && rejectModalOpen) {
        setRejectModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rejectModalOpen]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [lList, eList] = await Promise.all([
        leaveRequestsApi.getAll(),
        employeesApi.getAll(),
      ]);
      setAllLeaves(lList);
      setAllEmployees(eList);
    } catch {
      toast.error("Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, manager.userId]);

  // Scoped team
  const scopedTeam = useMemo(
    () => filterEmployeesForManager(allEmployees, manager),
    [allEmployees, manager]
  );
  const teamEmployeeIds = useMemo(() => scopedTeam.map((e) => e.id), [scopedTeam]);

  // Scoped leaves
  const scopedLeaves = useMemo(
    () => filterLeaveRequestsForManager(allLeaves, teamEmployeeIds),
    [allLeaves, teamEmployeeIds]
  );

  const filteredLeaves = useMemo(() => {
    if (statusFilter === "all") return scopedLeaves;
    return scopedLeaves.filter((l) => l.status === statusFilter);
  }, [scopedLeaves, statusFilter]);

  const pendingCount = scopedLeaves.filter((l) => l.status === "pending").length;
  const approvedCount = scopedLeaves.filter((l) => l.status === "approved").length;
  const rejectedCount = scopedLeaves.filter((l) => l.status === "rejected").length;

  const handleApprove = async (id: string, empName: string) => {
    try {
      await leaveRequestsApi.updateStatus(id, "approved", manager.userId);
      toast.success(`Leave request for ${empName} has been approved`);
      loadData();
    } catch {
      toast.error("Failed to approve leave request");
    }
  };

  const handleRejectOpen = (req: LeaveRequest) => {
    setSelectedRequest(req);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      await leaveRequestsApi.updateStatus(selectedRequest.id, "rejected", manager.userId);
      toast.info(`Leave request for ${selectedRequest.employee?.user?.full_name || "Employee"} was rejected`);
      setRejectModalOpen(false);
      setSelectedRequest(null);
      loadData();
    } catch {
      toast.error("Failed to reject leave request");
    }
  };

  // Helper to calculate days between dates
  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diff / (1000 * 3600 * 24)) + 1;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Team Leave Approvals"
        description={`Review, approve, or reject absence requests submitted by ${manager.departmentName} personnel reporting to ${manager.fullName}.`}
        breadcrumbs={[
          { label: "Dashboard", href: "/manager/dashboard" },
          { label: "Leave Approvals" },
        ]}
      />

      {/* KPI Counters */}
      <div className="grid gap-4 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setStatusFilter("pending")}
          className={`cursor-pointer rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
            statusFilter === "pending"
              ? "border-amber-500 bg-amber-500/10 shadow-card"
              : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide">Pending Approval</p>
            <Clock className="h-5 w-5 text-amber-500" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{pendingCount}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("approved")}
          className={`cursor-pointer rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            statusFilter === "approved"
              ? "border-emerald-500 bg-emerald-500/10 shadow-card"
              : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              Approved
            </p>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{approvedCount}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("rejected")}
          className={`cursor-pointer rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
            statusFilter === "rejected"
              ? "border-rose-500 bg-rose-500/10 shadow-card"
              : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide">Rejected</p>
            <XCircle className="h-5 w-5 text-rose-500" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{rejectedCount}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`cursor-pointer rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            statusFilter === "all"
              ? "border-blue-500 bg-blue-500/10 shadow-card"
              : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">All Requests</p>
            <FileCheck2 className="h-5 w-5 text-blue-500" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{scopedLeaves.length}</p>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {[
          { id: "pending" as const, label: "Pending Approval", count: pendingCount },
          { id: "approved" as const, label: "Approved", count: approvedCount },
          { id: "rejected" as const, label: "Rejected", count: rejectedCount },
          { id: "all" as const, label: "All Records", count: scopedLeaves.length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`flex min-h-[44px] sm:min-h-0 items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              statusFilter === tab.id
                ? "bg-amber-500 text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                statusFilter === tab.id ? "bg-black/20 text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Leave Requests Queue */}
      {loading ? (
        <div className="space-y-4" role="status" aria-busy="true">
          <span className="sr-only">Loading leave requests...</span>
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filteredLeaves.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 opacity-60" aria-hidden="true" />
          <h3 className="mt-3 text-base font-semibold text-foreground">No leave requests in this view</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            All leave requests for {manager.departmentName} have been processed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLeaves.map((req) => {
            const emp = scopedTeam.find((e) => e.id === req.employee_id) || req.employee;
            const empName = emp?.user?.full_name || "Team Member";
            const days = calculateDays(req.start_date, req.end_date);

            return (
              <div
                key={req.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-card-hover"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 font-bold text-base text-amber-500">
                    {empName.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h4 className="font-semibold text-base text-foreground">{empName}</h4>
                      <span className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {emp?.employee_id || "EMP"}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          req.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : req.status === "rejected"
                            ? "bg-rose-500/10 text-rose-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground capitalize">
                        {req.leave_type} Leave
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                        {req.start_date} to {req.end_date} ({days} days)
                      </span>
                      <span>•</span>
                      <span>Submitted: {new Date(req.created_at).toLocaleDateString()}</span>
                    </div>

                    <p className="mt-2 text-xs text-foreground bg-muted/40 p-2.5 rounded-lg leading-relaxed">
                      <strong>Reason:</strong> {req.reason}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2.5 md:flex-col md:items-end flex-shrink-0">
                  {req.status === "pending" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(req.id, empName)}
                        className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors"
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        <span>Approve Leave</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectOpen(req)}
                        className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 transition-colors"
                      >
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        <span>Reject</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground font-medium">
                      Processed by: {manager.fullName}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalOpen && selectedRequest && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manager-reject-leave-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 id="manager-reject-leave-modal-title" className="text-lg font-bold text-foreground">Reject Leave Application</h3>
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                aria-label="Close reject leave modal"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRejectConfirm} className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                You are rejecting the leave request from{" "}
                <strong>{selectedRequest.employee?.user?.full_name}</strong> for {selectedRequest.start_date} to {selectedRequest.end_date}.
              </p>

              <div>
                <label htmlFor="manager-reject-reason-input" className="text-xs font-semibold text-foreground">Rejection Reason / Notes *</label>
                <textarea
                  id="manager-reject-reason-input"
                  required
                  rows={3}
                  placeholder="Explain reason for rejection (e.g. conflicting project milestone, insufficient coverage)..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
