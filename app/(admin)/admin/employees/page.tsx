/**
 * app/(admin)/admin/employees/page.tsx
 *
 * Full CRUD Employee Directory:
 * - View all employees with department, designation, manager, and status
 * - Quick edit modal for designation, department, status, and reporting manager
 * - Delete employee with confirmation
 * - Department and Employment Status filters
 * - ExportButton (CSV, Excel, PDF)
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  employeesApi,
  departmentsApi,
  type Employee,
  type Department,
  type EmploymentStatus,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type ColumnDef } from "@/components/shared/DataTable";
import { ExportButton } from "@/components/shared/ExportButton";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<EmploymentStatus, { label: string; style: string }> = {
  active: { label: "Active", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  on_leave: { label: "On Leave", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  terminated: { label: "Terminated", style: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  resigned: { label: "Resigned", style: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
};

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [deptFilter, setDeptFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Modals
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [eList, dList] = await Promise.all([
        employeesApi.getAll(),
        departmentsApi.getAll(),
      ]);
      setEmployees(eList);
      setDepartments(dList);
    } catch {
      toast.error("Failed to load employee directory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editEmployee) setEditEmployee(null);
        if (deleteEmployee) setDeleteEmployee(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editEmployee, deleteEmployee]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmployee) return;

    try {
      await employeesApi.update(editEmployee.id, {
        fullName: editEmployee.user?.full_name,
        email: editEmployee.user?.email,
        designation: editEmployee.designation,
        department_id: editEmployee.department_id,
        reporting_manager_id: editEmployee.reporting_manager_id,
        employment_status: editEmployee.employment_status,
        phone: editEmployee.phone,
      });
      toast.success(`Employee ${editEmployee.employee_id} updated`);
      setEditEmployee(null);
      loadData();
    } catch {
      toast.error("Failed to update employee");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteEmployee) return;
    try {
      await employeesApi.delete(deleteEmployee.id);
      toast.success(`Employee ${deleteEmployee.user?.full_name || deleteEmployee.employee_id} removed`);
      setDeleteEmployee(null);
      loadData();
    } catch {
      toast.error("Failed to delete employee");
    }
  };

  const handleStatusToggle = async (emp: Employee, newStatus: EmploymentStatus) => {
    try {
      await employeesApi.update(emp.id, { employment_status: newStatus });
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus].label}`);
      loadData();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (deptFilter && e.department_id !== deptFilter) return false;
      if (statusFilter && e.employment_status !== statusFilter) return false;
      return true;
    });
  }, [employees, deptFilter, statusFilter]);

  const exportColumns = [
    { key: "employee_id", header: "Employee ID" },
    { key: "full_name", header: "Full Name" },
    { key: "email", header: "Email" },
    { key: "department", header: "Department" },
    { key: "designation", header: "Designation" },
    { key: "status", header: "Status" },
    { key: "joining_date", header: "Joining Date" },
  ];

  const exportData = useMemo(() => {
    return filtered.map((e) => ({
      employee_id: e.employee_id,
      full_name: e.user?.full_name || "",
      email: e.user?.email || "",
      department: e.department?.name || "Unassigned",
      designation: e.designation,
      status: e.employment_status,
      joining_date: e.joining_date,
    }));
  }, [filtered]);

  const columns: ColumnDef<Employee>[] = [
    {
      key: "employee_id",
      header: "Employee ID / Name",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-teal-600 font-bold text-xs" aria-hidden="true">
            {row.user?.full_name
              ? row.user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
              : "EM"}
          </div>
          <div>
            <Link
              href={`/admin/employees/${row.id}`}
              className="font-semibold text-foreground hover:text-teal-600 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              {row.user?.full_name || "Employee"}
            </Link>
            <p className="text-xs font-mono text-muted-foreground">{row.employee_id}</p>
          </div>
        </div>
      ),
    },
    {
      key: "designation",
      header: "Designation & Dept",
      sortable: true,
      cell: (row) => (
        <div className="space-y-0.5">
          <p className="font-medium text-foreground text-sm">{row.designation}</p>
          <p className="text-xs text-muted-foreground">{row.department?.name || "No Department"}</p>
        </div>
      ),
    },
    {
      key: "reporting_manager_id",
      header: "Reporting Manager",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.reporting_manager?.user?.full_name || "Direct to Admin"}
        </span>
      ),
    },
    {
      key: "employment_status",
      header: "Status",
      sortable: true,
      cell: (row) => {
        const meta = STATUS_CONFIG[row.employment_status] || STATUS_CONFIG.active;
        return (
          <select
            aria-label={`Change status for ${row.user?.full_name || row.employee_id}`}
            value={row.employment_status}
            onChange={(e) => handleStatusToggle(row, e.target.value as EmploymentStatus)}
            className={`min-h-[44px] sm:min-h-7 rounded-full border px-2.5 text-xs font-semibold uppercase tracking-wider ${meta.style} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          >
            {Object.keys(STATUS_CONFIG).map((st) => (
              <option key={st} value={st} className="bg-popover text-foreground">
                {STATUS_CONFIG[st as EmploymentStatus].label}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      key: "joining_date",
      header: "Joined",
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.joining_date).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/admin/employees/${row.id}`}
            title="View Profile"
            aria-label={`View profile for ${row.user?.full_name || row.employee_id}`}
            className="flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded p-2 sm:p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => setEditEmployee(row)}
            title="Edit Employee"
            aria-label={`Edit ${row.user?.full_name || row.employee_id}`}
            className="flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded p-2 sm:p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteEmployee(row)}
            title="Delete Employee"
            aria-label={`Delete ${row.user?.full_name || row.employee_id}`}
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
        title="Employee Roster"
        description="Manage company personnel, departmental allocations, designations, and account privileges."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Employees", href: "/admin/employees" },
          { label: "All Personnel" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButton filename="company_employees_roster" columns={exportColumns} data={exportData} />
            <Link
              href="/admin/employees/new"
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="h-4 w-4" /> Add Employee
            </Link>
          </div>
        }
      />

      {/* Filter strip */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <label htmlFor="dept-filter" className="text-xs font-medium text-muted-foreground">Department:</label>
          <select
            id="dept-filter"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="min-h-[44px] sm:min-h-8 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
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
                {STATUS_CONFIG[st as EmploymentStatus].label}
              </option>
            ))}
          </select>
        </div>

        {(deptFilter || statusFilter) && (
          <button
            type="button"
            onClick={() => {
              setDeptFilter("");
              setStatusFilter("");
            }}
            className="min-h-[44px] sm:min-h-0 inline-flex items-center text-xs text-teal-600 hover:underline sm:ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* DataTable with loading skeleton */}
      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyTitle="No employees found"
        emptyDescription="No employee records match the selected filter."
      />

      {/* Edit Employee Modal */}
      {editEmployee && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-employee-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in">
            <h3 id="edit-employee-title" className="text-lg font-semibold text-foreground">
              Edit Employee: {editEmployee.employee_id}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Update position, reporting line, or departmental placement.
            </p>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="edit-emp-name" className="text-xs font-medium text-foreground">Full Name</label>
                <input
                  id="edit-emp-name"
                  type="text"
                  required
                  value={editEmployee.user?.full_name || ""}
                  onChange={(e) =>
                    setEditEmployee({
                      ...editEmployee,
                      user: { ...editEmployee.user!, full_name: e.target.value },
                    })
                  }
                  className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-emp-desig" className="text-xs font-medium text-foreground">Designation / Role Title</label>
                  <input
                    id="edit-emp-desig"
                    type="text"
                    required
                    value={editEmployee.designation}
                    onChange={(e) => setEditEmployee({ ...editEmployee, designation: e.target.value })}
                    className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="edit-emp-dept" className="text-xs font-medium text-foreground">Department</label>
                  <select
                    id="edit-emp-dept"
                    value={editEmployee.department_id || ""}
                    onChange={(e) => setEditEmployee({ ...editEmployee, department_id: e.target.value })}
                    className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">No Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-emp-mgr" className="text-xs font-medium text-foreground">Reporting Manager</label>
                  <select
                    id="edit-emp-mgr"
                    value={editEmployee.reporting_manager_id || ""}
                    onChange={(e) => setEditEmployee({ ...editEmployee, reporting_manager_id: e.target.value })}
                    className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">None (Reports to Admin)</option>
                    {employees
                      .filter((e) => e.id !== editEmployee.id)
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.user?.full_name} ({e.designation})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-emp-status" className="text-xs font-medium text-foreground">Employment Status</label>
                  <select
                    id="edit-emp-status"
                    value={editEmployee.employment_status}
                    onChange={(e) =>
                      setEditEmployee({ ...editEmployee, employment_status: e.target.value as EmploymentStatus })
                    }
                    className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {Object.keys(STATUS_CONFIG).map((st) => (
                      <option key={st} value={st}>
                        {STATUS_CONFIG[st as EmploymentStatus].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditEmployee(null)}
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
      {deleteEmployee && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-employee-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in">
            <h3 id="delete-employee-title" className="text-lg font-semibold text-foreground">Remove Employee</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-foreground">
                {deleteEmployee.user?.full_name || deleteEmployee.employee_id}
              </span>
              ? This action will unlink their tasks and archive their attendance records.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteEmployee(null)}
                className="min-h-[44px] sm:min-h-0 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="min-h-[44px] sm:min-h-0 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Delete Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
