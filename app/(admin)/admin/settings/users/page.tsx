/**
 * app/(admin)/admin/settings/users/page.tsx
 *
 * User Accounts & Roles Management:
 * - User roster with email, role (admin, manager, client), and account status
 * - Role assignment dropdown
 * - Account activation / suspension toggle
 * - Invite / Add User modal
 */

"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  usersApi,
  type User,
  type UserRole,
  type UserStatus,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type ColumnDef } from "@/components/shared/DataTable";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

const ROLE_CONFIG: Record<UserRole, { label: string; style: string }> = {
  admin: { label: "Administrator", style: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/20" },
  manager: { label: "Manager", style: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  client: { label: "Staff / Client", style: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/20" },
};

const STATUS_CONFIG: Record<UserStatus, { label: string; style: string }> = {
  active: { label: "Active", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  inactive: { label: "Inactive", style: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
  suspended: { label: "Suspended", style: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newForm, setNewForm] = useState({
    full_name: "",
    email: "",
    role: "manager" as UserRole,
  });

  const loadData = useCallback(async () => {
    try {
      const uList = await usersApi.getAll();
      setUsers(uList);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleRoleChange = async (user: User, newRole: UserRole) => {
    try {
      await usersApi.updateRole(user.id, newRole);
      toast.success(`Role for ${user.full_name} updated to ${ROLE_CONFIG[newRole].label}`);
      loadData();
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleStatusChange = async (user: User, newStatus: UserStatus) => {
    try {
      await usersApi.updateStatus(user.id, newStatus);
      toast.success(`Account status for ${user.full_name} set to ${newStatus}`);
      loadData();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.full_name.trim() || !newForm.email.trim()) {
      toast.error("Please fill in full name and valid email.");
      return;
    }

    try {
      await usersApi.create(newForm);
      toast.success(`Invitation dispatched to ${newForm.email}`);
      setShowAddModal(false);
      setNewForm({ full_name: "", email: "", role: "manager" });
      loadData();
    } catch {
      toast.error("Failed to add user");
    }
  };

  const columns: ColumnDef<User>[] = [
    {
      key: "full_name",
      header: "User / Email",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-teal-600 font-bold text-xs" aria-hidden="true">
            {row.full_name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{row.full_name}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role Assignment",
      sortable: true,
      cell: (row) => (
        <select
          aria-label={`Change role for ${row.full_name}`}
          value={row.role}
          onChange={(e) => handleRoleChange(row, e.target.value as UserRole)}
          className="min-h-[44px] sm:min-h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring capitalize"
        >
          <option value="admin">Administrator</option>
          <option value="manager">Manager</option>
          <option value="client">Client / Staff</option>
        </select>
      ),
    },
    {
      key: "status",
      header: "Account Status",
      sortable: true,
      cell: (row) => (
        <select
          aria-label={`Change status for ${row.full_name}`}
          value={row.status}
          onChange={(e) => handleStatusChange(row, e.target.value as UserStatus)}
          className={`min-h-[44px] sm:min-h-7 rounded-full border px-2.5 text-xs font-semibold uppercase tracking-wider ${
            STATUS_CONFIG[row.status]?.style || STATUS_CONFIG.active.style
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      ),
    },
    {
      key: "created_at",
      header: "Registered",
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Accounts & Roles"
        description="Manage portal access, assign operational roles, and enforce security policies."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Settings", href: "/admin/settings/company" },
          { label: "User Access" },
        ]}
        actions={
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" /> Invite User
          </button>
        }
      />

      {/* Main DataTable with skeleton */}
      <DataTable columns={columns} data={users} loading={loading} emptyTitle="No users found" />

      {/* Invite Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-user-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in">
            <h3 id="invite-user-title" className="text-lg font-semibold text-foreground">Invite User Account</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Send access invitation link with predefined system privileges.
            </p>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="invite-full-name" className="text-xs font-medium text-foreground">Full Name *</label>
                <input
                  id="invite-full-name"
                  type="text"
                  required
                  aria-required="true"
                  placeholder="e.g. Tariq Al-Ghamdi"
                  value={newForm.full_name}
                  onChange={(e) => setNewForm({ ...newForm, full_name: e.target.value })}
                  className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label htmlFor="invite-email" className="text-xs font-medium text-foreground">Email Address *</label>
                <input
                  id="invite-email"
                  type="email"
                  required
                  aria-required="true"
                  placeholder="tariq@aleefcrm.com"
                  value={newForm.email}
                  onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                  className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label htmlFor="invite-role" className="text-xs font-medium text-foreground">Assigned Role</label>
                <select
                  id="invite-role"
                  value={newForm.role}
                  onChange={(e) => setNewForm({ ...newForm, role: e.target.value as UserRole })}
                  className="mt-1 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="admin">Administrator (Full Access)</option>
                  <option value="manager">Manager (Department Operations)</option>
                  <option value="client">Client / General Staff</option>
                </select>
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
                  Dispatch Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
