/**
 * app/(admin)/admin/employees/new/page.tsx
 *
 * Full Employee Creation & Onboarding Form:
 * - Personal Information (Full name, Email, Phone)
 * - Job Details (Employee ID, Designation, Department)
 * - Reporting Hierarchy & Joining Date
 * - System Role Assignment (Client, Manager, Admin)
 */

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  employeesApi,
  departmentsApi,
  type Department,
  type Employee,
  type UserRole,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserPlus, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export default function NewEmployeePage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    employeeId: `EMP-00${Math.floor(Math.random() * 90) + 10}`,
    designation: "",
    departmentId: "",
    joiningDate: new Date().toISOString().slice(0, 10),
    reportingManagerId: "",
    role: "client" as UserRole,
  });

  useEffect(() => {
    async function loadOptions() {
      try {
        const [dList, eList] = await Promise.all([
          departmentsApi.getAll(),
          employeesApi.getAll(),
        ]);
        setDepartments(dList);
        setManagers(eList);
        if (dList.length > 0) {
          setFormData((prev) => ({ ...prev, departmentId: dList[0].id }));
        }
      } catch {
        toast.error("Failed to load department options");
      }
    }
    loadOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.designation.trim()) {
      toast.error("Please fill in all required fields (Name, Email, Designation).");
      return;
    }

    setSubmitting(true);
    try {
      const created = await employeesApi.create({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        employeeId: formData.employeeId.trim(),
        designation: formData.designation.trim(),
        departmentId: formData.departmentId || undefined,
        joiningDate: formData.joiningDate,
        reportingManagerId: formData.reportingManagerId || undefined,
        role: formData.role,
      });

      toast.success(`Employee ${created.user?.full_name} (${created.employee_id}) onboarded!`);
      router.push(`/admin/employees/${created.id}`);
    } catch {
      toast.error("Failed to onboard employee");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Employee"
        description="Onboard a new employee into Aleef CRM & HR systems."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Employees", href: "/admin/employees" },
          { label: "New Employee" },
        ]}
        actions={
          <Link
            href="/admin/employees"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> Cancel
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Personal Info */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="h-5 w-5 text-teal-600" aria-hidden="true" />
            <h2 className="text-base font-semibold text-foreground">Personal Information</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="new-emp-name" className="text-xs font-medium text-foreground">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="new-emp-name"
                type="text"
                required
                aria-required="true"
                placeholder="e.g. Faisal Al-Shahrani"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="mt-1.5 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="new-emp-email" className="text-xs font-medium text-foreground">
                Work Email <span className="text-rose-500">*</span>
              </label>
              <input
                id="new-emp-email"
                type="email"
                required
                aria-required="true"
                placeholder="faisal@aleefcrm.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1.5 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="new-emp-phone" className="text-xs font-medium text-foreground">Phone Number</label>
              <input
                id="new-emp-phone"
                type="tel"
                placeholder="+966 50 123 4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1.5 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Position & Department */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold text-foreground mb-4">Role & Organization</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="new-emp-code" className="text-xs font-medium text-foreground">
                Employee Code / ID <span className="text-rose-500">*</span>
              </label>
              <input
                id="new-emp-code"
                type="text"
                required
                aria-required="true"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="mt-1.5 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="new-emp-desig" className="text-xs font-medium text-foreground">
                Designation / Position <span className="text-rose-500">*</span>
              </label>
              <input
                id="new-emp-desig"
                type="text"
                required
                aria-required="true"
                placeholder="e.g. Senior Frontend Engineer"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="mt-1.5 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="new-emp-dept" className="text-xs font-medium text-foreground">Department</label>
              <select
                id="new-emp-dept"
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="mt-1.5 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="new-emp-date" className="text-xs font-medium text-foreground">Joining Date</label>
              <input
                id="new-emp-date"
                type="date"
                required
                aria-required="true"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="mt-1.5 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="new-emp-mgr" className="text-xs font-medium text-foreground">Reporting Manager</label>
              <select
                id="new-emp-mgr"
                value={formData.reportingManagerId}
                onChange={(e) => setFormData({ ...formData, reportingManagerId: e.target.value })}
                className="mt-1.5 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">None (Reports to Admin)</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.user?.full_name} ({m.designation})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="new-emp-role" className="text-xs font-medium text-foreground">System Role</label>
              <select
                id="new-emp-role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="mt-1.5 w-full min-h-[44px] sm:min-h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="client">Employee / Staff</option>
                <option value="manager">Department Manager</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link
            href="/admin/employees"
            className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Save className="h-4 w-4" />
            {submitting ? "Onboarding..." : "Onboard Employee"}
          </button>
        </div>
      </form>
    </div>
  );
}
