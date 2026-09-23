/**
 * app/(admin)/admin/crm/clients/new/page.tsx
 *
 * Full Client Creation Form:
 * - Company and Primary Contact Information
 * - Business Attributes (Industry, Lead Source)
 * - Account Executive Assignment & Pipeline Status
 * - Validation, Error Handling, and Toast Feedback
 */

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clientsApi, usersApi, type User, type ClientStatus } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { Building2, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export default function NewClientPage() {
  const router = useRouter();
  const [managers, setManagers] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    industry: "",
    source: "Website",
    assigned_manager_id: "",
    status: "lead" as ClientStatus,
    notes: "",
  });

  useEffect(() => {
    async function loadManagers() {
      try {
        const uList = await usersApi.getAll();
        setManagers(uList.filter((u) => u.role === "manager" || u.role === "admin"));
        if (uList.length > 0) {
          setFormData((prev) => ({ ...prev, assigned_manager_id: uList[0].id }));
        }
      } catch {
        toast.error("Failed to load managers");
      }
    }
    loadManagers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name.trim() || !formData.contact_person.trim()) {
      toast.error("Please fill in company name and primary contact person.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await clientsApi.create({
        company_name: formData.company_name.trim(),
        contact_person: formData.contact_person.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        industry: formData.industry.trim(),
        source: formData.source,
        assigned_manager_id: formData.assigned_manager_id || undefined,
        status: formData.status,
        notes: formData.notes.trim(),
      });
      toast.success(`Client ${created.company_name} successfully added!`);
      router.push(`/admin/crm/clients/${created.id}`);
    } catch {
      toast.error("Error creating client record");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Client"
        description="Register a new client account into the CRM database."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Clients", href: "/admin/crm/clients" },
          { label: "New Client" },
        ]}
        actions={
          <Link
            href="/admin/crm/clients"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> Cancel
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Company Profile */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-teal-600" />
            <h2 className="text-base font-semibold text-foreground">Company Details</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="client-company-name" className="text-xs font-medium text-foreground">
                Company / Organization Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="client-company-name"
                type="text"
                required
                aria-required="true"
                placeholder="e.g. Apex Global Logistics"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="mt-1.5 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="client-industry" className="text-xs font-medium text-foreground">Industry Sector</label>
              <input
                id="client-industry"
                type="text"
                placeholder="e.g. Supply Chain, FinTech, Healthcare"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="mt-1.5 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="client-address" className="text-xs font-medium text-foreground">Office Address</label>
              <input
                id="client-address"
                type="text"
                placeholder="e.g. King Fahd Road, Riyadh, Saudi Arabia"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="mt-1.5 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Information */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold text-foreground mb-4">Primary Contact Information</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="client-contact-person" className="text-xs font-medium text-foreground">
                Contact Person Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="client-contact-person"
                type="text"
                required
                aria-required="true"
                placeholder="e.g. Farid Al-Zahrani"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="mt-1.5 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="client-email" className="text-xs font-medium text-foreground">Business Email</label>
              <input
                id="client-email"
                type="email"
                placeholder="e.g. farid@company.sa"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1.5 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="client-phone" className="text-xs font-medium text-foreground">Phone Number</label>
              <input
                id="client-phone"
                type="tel"
                placeholder="e.g. +966 50 123 4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1.5 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Section 3: CRM Assignment & Pipeline */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold text-foreground mb-4">Pipeline & Management</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="client-status-select" className="text-xs font-medium text-foreground">Pipeline Status</label>
              <select
                id="client-status-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ClientStatus })}
                className="mt-1.5 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <option value="lead">Lead</option>
                <option value="prospect">Prospect</option>
                <option value="active">Active Client</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            <div>
              <label htmlFor="client-manager-select" className="text-xs font-medium text-foreground">Assigned Manager</label>
              <select
                id="client-manager-select"
                value={formData.assigned_manager_id}
                onChange={(e) => setFormData({ ...formData, assigned_manager_id: e.target.value })}
                className="mt-1.5 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <option value="">Unassigned</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="client-source-select" className="text-xs font-medium text-foreground">Acquisition Source</label>
              <select
                id="client-source-select"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="mt-1.5 min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <option value="Website">Website Form</option>
                <option value="Referral">Client Referral</option>
                <option value="Cold Outreach">Cold Outreach</option>
                <option value="Event Exhibition">Exhibition / Event</option>
                <option value="Partner">Partner Channel</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="client-notes" className="text-xs font-medium text-foreground">Internal Notes & Context</label>
              <textarea
                id="client-notes"
                rows={3}
                placeholder="Add background info, contract terms, or special requirements..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link
            href="/admin/crm/clients"
            className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <Save className="h-4 w-4" />
            {submitting ? "Saving Client..." : "Create Client"}
          </button>
        </div>
      </form>
    </div>
  );
}
