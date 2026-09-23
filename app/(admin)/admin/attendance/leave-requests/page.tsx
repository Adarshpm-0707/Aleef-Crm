/**
 * app/(admin)/admin/attendance/leave-requests/page.tsx
 *
 * Leave Request Management & Approvals:
 * - Queue of pending, approved, and rejected leave applications
 * - One-click Approve and Reject buttons with instant toast feedback
 * - Admin action to submit leave on behalf of any employee
 * - Status & Leave type filtering
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  leaveRequestsApi,
  employeesApi,
  type LeaveRequest,
  type Employee,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type ColumnDef } from "@/components/shared/DataTable";
import {
  Check,
  X,
  Plus,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [typeFilter, setTypeFilter] = useState<string>("");

  // Submit on behalf modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newForm, setNewForm] = useState<{
    employee_id: string;
    leave_type: LeaveRequest["leave_type"];
    start_date: string;
    end_date: string;
    reason: string;
  }>({
    employee_id: "",
    leave_type: "annual",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    reason: "",
  });

  const loadData = useCallback(async () => {
    try {
      const [rList, eList] = await Promise.all([
        leaveRequestsApi.getAll(),
        employeesApi.getAll(),
      ]);
      setRequests(rList);
      setEmployees(eList);
      if (eList.length > 0 && !newForm.employee_id) {
        setNewForm((prev) => ({ ...prev, employee_id: eList[0].id }));
      }
    } catch {
      toast.error("Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  }, [newForm.employee_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showAddModal) {
        setShowAddModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddModal]);

  const handleApprove = async (req: LeaveRequest) => {
    try {
      await leaveRequestsApi.updateStatus(req.id, "approved");
      toast.success(`Leave request for ${req.employee?.user?.full_name} approved!`);
      loadData();
    } catch {
      toast.error("Failed to approve request");
    }
  };

  const handleReject = async (req: LeaveRequest) => {
    try {
      await leaveRequestsApi.updateStatus(req.id, "rejected");
      toast.error(`Leave request for ${req.employee?.user?.full_name} rejected.`);
      loadData();
    } catch {
      toast.error("Failed to reject request");
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.employee_id || !newForm.reason.trim()) {
      toast.error("Please select an employee and state the reason.");
      return;
    }

    try {
      await leaveRequestsApi.create(newForm);
      toast.success("Leave request submitted");
      setShowAddModal(false);
      setNewForm({
        employee_id: employees[0]?.id || "",
        leave_type: "annual",
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
        reason: "",
      });
      loadData();
    } catch {
      toast.error("Failed to submit leave request");
    }
  };

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (typeFilter && r.leave_type !== typeFilter) return false;
      return true;
    });
  }, [requests, statusFilter, typeFilter]);

  const columns: ColumnDef<LeaveRequest>[] = [
    {
      key: "employee",
      header: "Employee / Department",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500/15 text-teal-600 font-bold text-xs">
            {row.employee?.user?.full_name
              ? row.employee.user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
              : "EM"}
          </div>
          <div>
            <p className="font-semibold text-foreground">{row.employee?.user?.full_name}</p>
            <p className="text-xs text-muted-foreground">{row.employee?.department?.name || "Staff"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "leave_type",
      header: "Type",
      sortable: true,
      cell: (row) => (
        <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold capitalize text-foreground">
          {row.leave_type} Leave
        </span>
      ),
    },
    {
      key: "dates",
      header: "Duration",
      cell: (row) => {
        const start = new Date(row.start_date);
        const end = new Date(row.end_date);
        const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        return (
          <div>
            <p className="text-xs font-medium text-foreground">
              {row.start_date} <span className="text-muted-foreground">to</span> {row.end_date}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {days} working {days === 1 ? "day" : "days"}
            </p>
          </div>
        );
      },
    },
    {
      key: "reason",
      header: "Reason / Purpose",
      cell: (row) => <p className="max-w-xs text-xs text-muted-foreground truncate">{row.reason}</p>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (row) => {
        if (row.status === "approved") {
          return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" /> Approved
            </span>
          );
        }
        if (row.status === "rejected") {
          return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-500">
              <XCircle className="h-3.5 w-3.5" /> Rejected
            </span>
          );
        }
        return (
          <span className="inline-flex rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500">
            Pending Review
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Decide",
      cell: (row) => {
        if (row.status !== "pending") {
          return <span className="text-xs text-muted-foreground italic">Processed</span>;
        }
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleApprove(row)}
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Approve leave for ${row.employee?.user?.full_name}`}
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Approve
            </button>
            <button
              type="button"
              onClick={() => handleReject(row)}
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1 rounded bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Reject leave for ${row.employee?.user?.full_name}`}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" /> Reject
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Requests & Time-Off"
        description="Review, approve, or reject employee leave applications, vacation requests, and medical leaves."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Attendance", href: "/admin/attendance/today" },
          { label: "Leave Requests" },
        ]}
        actions={
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Submit on Behalf
          </button>
        }
      />

      {/* Filter strip */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <label htmlFor="leave-status-filter" className="text-xs font-medium text-muted-foreground">Status:</label>
          <select
            id="leave-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-[44px] sm:min-h-8 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <label htmlFor="leave-type-filter" className="text-xs font-medium text-muted-foreground">Leave Type:</label>
          <select
            id="leave-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="min-h-[44px] sm:min-h-8 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Types</option>
            <option value="annual">Annual Leave</option>
            <option value="sick">Sick Leave</option>
            <option value="emergency">Emergency</option>
            <option value="unpaid">Unpaid Leave</option>
          </select>
        </div>
      </div>

      {/* Main DataTable with loading skeleton */}
      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyTitle="No leave requests matching filter"
        emptyDescription="All pending employee requests have been processed."
      />

      {/* Submit Leave on Behalf Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="record-leave-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in">
            <h3 id="record-leave-title" className="text-lg font-semibold text-foreground">Record Leave Request</h3>
            <p className="mt-1 text-xs text-muted-foreground">Submit leave on behalf of an employee.</p>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="modal-leave-emp" className="text-xs font-medium text-foreground">Select Employee *</label>
                <select
                  id="modal-leave-emp"
                  required
                  aria-required="true"
                  value={newForm.employee_id}
                  onChange={(e) => setNewForm({ ...newForm, employee_id: e.target.value })}
                  className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.user?.full_name} ({emp.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="modal-leave-type" className="text-xs font-medium text-foreground">Leave Type *</label>
                <select
                  id="modal-leave-type"
                  value={newForm.leave_type}
                  onChange={(e) => setNewForm({ ...newForm, leave_type: e.target.value as LeaveRequest["leave_type"] })}
                  className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="emergency">Emergency Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="modal-leave-start" className="text-xs font-medium text-foreground">Start Date *</label>
                  <input
                    id="modal-leave-start"
                    type="date"
                    required
                    aria-required="true"
                    value={newForm.start_date}
                    onChange={(e) => setNewForm({ ...newForm, start_date: e.target.value })}
                    className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="modal-leave-end" className="text-xs font-medium text-foreground">End Date *</label>
                  <input
                    id="modal-leave-end"
                    type="date"
                    required
                    aria-required="true"
                    value={newForm.end_date}
                    onChange={(e) => setNewForm({ ...newForm, end_date: e.target.value })}
                    className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="modal-leave-reason" className="text-xs font-medium text-foreground">Reason / Comments *</label>
                <textarea
                  id="modal-leave-reason"
                  required
                  aria-required="true"
                  rows={3}
                  value={newForm.reason}
                  onChange={(e) => setNewForm({ ...newForm, reason: e.target.value })}
                  placeholder="e.g. Approved medical leave with certificate."
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="min-h-[44px] sm:min-h-0 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] sm:min-h-0 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Submit Leave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
