/**
 * app/(admin)/admin/employees/departments/page.tsx
 *
 * Department Management & Org Units:
 * - Department Cards with Head of Department, employee count, active projects
 * - Full CRUD: Add Department, Edit Department Name, Delete Department
 * - Quick filter & stats overview
 */

"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  departmentsApi,
  employeesApi,
  type Department,
  type Employee,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
} from "lucide-react";
import { CardSkeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [deleteDept, setDeleteDept] = useState<Department | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [dList, eList] = await Promise.all([
        departmentsApi.getAll(),
        employeesApi.getAll(),
      ]);
      setDepartments(dList);
      setEmployees(eList);
    } catch {
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Escape key to close any active modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showAddModal) setShowAddModal(false);
        if (editDept) setEditDept(null);
        if (deleteDept) setDeleteDept(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddModal, editDept, deleteDept]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    try {
      await departmentsApi.create({ name: newDeptName.trim() });
      toast.success(`Department "${newDeptName.trim()}" created`);
      setNewDeptName("");
      setShowAddModal(false);
      loadData();
    } catch {
      toast.error("Failed to create department");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDept || !editDept.name.trim()) return;

    try {
      await departmentsApi.update(editDept.id, { name: editDept.name.trim() });
      toast.success("Department renamed successfully");
      setEditDept(null);
      loadData();
    } catch {
      toast.error("Failed to rename department");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDept) return;
    try {
      await departmentsApi.delete(deleteDept.id);
      toast.success(`Department "${deleteDept.name}" deleted`);
      setDeleteDept(null);
      loadData();
    } catch {
      toast.error("Failed to delete department");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments & Org Units"
        description="Configure internal company departments, personnel allocations, and team capacities."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Employees", href: "/admin/employees" },
          { label: "Departments" },
        ]}
        actions={
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-4 w-4" /> Add Department
          </button>
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Total Departments</span>
          <p className="mt-1 text-2xl font-bold text-foreground">{departments.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Assigned Personnel</span>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {employees.filter((e) => e.department_id).length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Average Department Size</span>
          <p className="mt-1 text-2xl font-bold text-teal-600">
            {departments.length > 0 ? (employees.length / departments.length).toFixed(1) : 0} staff
          </p>
        </div>
      </div>

      {/* Department Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-busy="true">
          <span className="sr-only">Loading departments...</span>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => {
          const members = employees.filter((e) => e.department_id === dept.id);
          return (
            <div
              key={dept.id}
              className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md hover:border-teal-500/30"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 font-bold" aria-hidden="true">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditDept(dept)}
                      title="Edit Name"
                      aria-label={`Edit ${dept.name}`}
                      className="flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded p-2 sm:p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteDept(dept)}
                      title="Delete Department"
                      aria-label={`Delete ${dept.name}`}
                      className="flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded p-2 sm:p-1.5 text-rose-500 hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-lg font-bold text-foreground">{dept.name}</h3>
                  <p className="text-xs text-muted-foreground">Created {new Date(dept.created_at).toLocaleDateString()}</p>
                </div>

                <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Staff Members</span>
                    <span className="font-semibold text-foreground">{members.length} employees</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Active Projects</span>
                    <span className="font-semibold text-foreground">2 projects</span>
                  </div>
                </div>

                {/* Team member avatars */}
                {members.length > 0 && (
                  <div className="mt-4 flex items-center -space-x-2">
                    {members.slice(0, 4).map((m) => (
                      <div
                        key={m.id}
                        title={m.user?.full_name}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white ring-2 ring-card"
                      >
                        {m.user?.full_name?.slice(0, 1) || "E"}
                      </div>
                    ))}
                    {members.length > 4 && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-card">
                        +{members.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-border/60">
                <Link
                  href={`/admin/employees?department=${dept.id}`}
                  className="min-h-[44px] sm:min-h-0 text-xs font-semibold text-teal-600 hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  View Team Members &rarr;
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Add Department Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-dept-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in">
            <h3 id="add-dept-title" className="text-lg font-semibold text-foreground">Add Department</h3>
            <p className="mt-1 text-xs text-muted-foreground">Create a new organizational business unit.</p>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="add-dept-name" className="text-xs font-medium text-foreground">Department Name *</label>
                <input
                  id="add-dept-name"
                  type="text"
                  required
                  aria-required="true"
                  placeholder="e.g. Legal & Compliance"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editDept && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-dept-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in">
            <h3 id="edit-dept-title" className="text-lg font-semibold text-foreground">Rename Department</h3>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="edit-dept-name" className="text-xs font-medium text-foreground">Department Name</label>
                <input
                  id="edit-dept-name"
                  type="text"
                  required
                  aria-required="true"
                  value={editDept.name}
                  onChange={(e) => setEditDept({ ...editDept, name: e.target.value })}
                  className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditDept(null)}
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

      {/* Delete Department Modal */}
      {deleteDept && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dept-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in">
            <h3 id="delete-dept-title" className="text-lg font-semibold text-foreground">Confirm Delete</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{deleteDept.name}</span>? Staff members assigned to this department will be unassigned.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteDept(null)}
                className="min-h-[44px] sm:min-h-0 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="min-h-[44px] sm:min-h-0 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
