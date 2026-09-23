/**
 * app/(client)/portal/profile/page.tsx
 *
 * Client Portal Profile:
 *  - View and edit OWN contact info only (contact person, phone, email, address)
 *  - Read-only enterprise attributes (company name, industry, manager, status)
 *  - Strictly guards business metadata from unauthorized tampering
 *  - Full WCAG AA accessibility, aria attributes, and 44px mobile touch targets
 */

"use client";

import React, { useState, useEffect } from "react";
import { useCurrentClient } from "@/lib/permissions/client";
import { clientsApi } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { CardSkeleton } from "@/components/ui/skeleton";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  ShieldCheck,
  Save,
  Lock,
  CheckCircle2,
  Briefcase,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export default function ClientProfilePage() {
  const { client, updateContactInfo } = useCurrentClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable Contact Fields Only
  const [contactPerson, setContactPerson] = useState(client.contactPerson);
  const [email, setEmail] = useState(client.email);
  const [phone, setPhone] = useState(client.phone);
  const [address, setAddress] = useState(client.address);

  // Sync with active client state on switch and simulate load
  useEffect(() => {
    setContactPerson(client.contactPerson);
    setEmail(client.email);
    setPhone(client.phone);
    setAddress(client.address);
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [client]);

  const handleSaveContactInfo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contactPerson.trim()) {
      toast.error("Contact person name is required");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please provide a valid email address");
      return;
    }

    try {
      setSaving(true);

      // Persist to store/backend
      await clientsApi.update(client.clientId, {
        contact_person: contactPerson.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });

      // Update in-memory and local storage client context
      updateContactInfo({
        contactPerson: contactPerson.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });

      toast.success("Contact information updated successfully!");
    } catch {
      toast.error("Failed to update contact information");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account & Contact Profile"
        description={`Manage primary contact details and view account configuration for ${client.companyName}`}
        breadcrumbs={[
          { label: "Client Portal", href: "/portal/dashboard" },
          { label: "Profile" },
        ]}
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <CardSkeleton />
          <div className="lg:col-span-2">
            <CardSkeleton />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column (1 Col): Read-Only Company Details */}
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-500 flex items-center justify-center font-bold text-white text-lg shadow-md shrink-0">
                  {client.companyName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-foreground truncate">
                    {client.companyName}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 capitalize mt-1">
                    <CheckCircle2 className="h-3 w-3" /> {client.status} Client
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Briefcase className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" /> Industry Vertical
                  </p>
                  <p className="font-semibold text-foreground mt-0.5">{client.industry}</p>
                </div>

                <div>
                  <p className="text-muted-foreground flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-teal-500 dark:text-teal-400" /> Assigned Account Manager
                  </p>
                  <p className="font-semibold text-foreground mt-0.5">{client.assignedManagerName}</p>
                  <p className="text-[11px] text-muted-foreground">{client.assignedManagerEmail}</p>
                </div>

                <div>
                  <p className="text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Building2 className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" /> Client ID
                  </p>
                  <p className="font-mono font-semibold text-foreground mt-0.5">{client.clientId}</p>
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">
                <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Company credentials, enterprise status, and account manager assignments are governed by contractual agreement. To request changes, please reach out to your Account Manager.
                </span>
              </div>
            </div>
          </div>

          {/* Right Column (2 Cols): Editable Own Contact Information */}
          <div className="lg:col-span-2">
            <form
              onSubmit={handleSaveContactInfo}
              className="rounded-xl border border-border bg-card p-6 shadow-card space-y-6"
            >
              <div className="border-b border-border pb-4">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4 text-sky-500 dark:text-sky-400" /> Your Contact Information
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update your primary point of contact info for communications, deliverables updates, and notifications.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Contact Person Name */}
                <div className="space-y-1.5">
                  <label htmlFor="contact-person" className="block text-xs font-semibold text-foreground">
                    Contact Person Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      id="contact-person"
                      type="text"
                      required
                      aria-required="true"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 min-h-[44px] sm:min-h-9 h-11 sm:h-9 text-xs text-foreground focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500"
                      placeholder="e.g. Farid Al-Zahrani"
                    />
                  </div>
                </div>

                {/* Direct Email */}
                <div className="space-y-1.5">
                  <label htmlFor="contact-email" className="block text-xs font-semibold text-foreground">
                    Primary Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      id="contact-email"
                      type="email"
                      required
                      aria-required="true"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 min-h-[44px] sm:min-h-9 h-11 sm:h-9 text-xs text-foreground focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                {/* Direct Phone */}
                <div className="space-y-1.5">
                  <label htmlFor="contact-phone" className="block text-xs font-semibold text-foreground">
                    Direct Telephone / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      id="contact-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 min-h-[44px] sm:min-h-9 h-11 sm:h-9 text-xs text-foreground focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500"
                      placeholder="+966 50 000 0000"
                    />
                  </div>
                </div>

                {/* Company Physical / Billing Address */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="contact-address" className="block text-xs font-semibold text-foreground">
                    Office / Billing Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <textarea
                      id="contact-address"
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-xs text-foreground focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500 resize-none min-h-[60px]"
                      placeholder="Street, District, City, Country"
                    />
                  </div>
                </div>
              </div>

              {/* Save Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border">
                <p className="text-[11px] text-muted-foreground">
                  All changes take effect immediately across all project notifications.
                </p>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-5 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 text-xs font-bold text-white hover:bg-sky-400 active:scale-95 disabled:opacity-50 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Save Contact Info
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
