/**
 * app/(admin)/admin/settings/company/page.tsx
 *
 * Company Profile & Enterprise Configuration Hub:
 * - Legal entity & trade name
 * - Contact details (email, phone, corporate address)
 * - Tax/VAT registration, currency & timezone
 * - Standard working hours, grace periods & half-day thresholds
 * - Automated system notification toggles
 * - Direct integration with settingsApi (Supabase + local store fallback)
 */

"use client";

import React, { useEffect, useState } from "react";
import { settingsApi, type CompanySettings } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Clock,
  Bell,
  Save,
  RotateCcw,
  Mail,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export default function CompanySettingsPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadSettings() {
    try {
      const data = await settingsApi.getCompanySettings();
      setSettings(data);
      setOriginalSettings(JSON.parse(JSON.stringify(data)));
    } catch {
      toast.error("Failed to load company settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = <K extends keyof CompanySettings>(field: K, value: CompanySettings[K]) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [field]: value,
    });
  };

  const handleNotificationChange = (
    key: keyof CompanySettings["notifications"],
    value: boolean
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value,
      },
    });
  };

  const handleReset = () => {
    if (originalSettings) {
      setSettings(JSON.parse(JSON.stringify(originalSettings)));
      toast.info("Changes reverted to saved state");
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settings) return;

    if (!settings.name.trim() || !settings.email.trim()) {
      toast.error("Company Name and Contact Email are required");
      return;
    }

    setSaving(true);
    try {
      const updated = await settingsApi.updateCompanySettings(settings);
      setSettings(updated);
      setOriginalSettings(JSON.parse(JSON.stringify(updated)));
      toast.success("Company settings updated successfully!");
    } catch {
      toast.error("Failed to save company settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="space-y-8 pb-12" role="status" aria-busy="true">
        <span className="sr-only">Loading company settings...</span>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Company Profile & Policies"
        description="Manage legal organization details, standard working hours, attendance policies, and system notifications."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Settings", href: "/admin/settings/company" },
          { label: "Company Profile" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Revert
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:opacity-50 shadow-sm"
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        }
      />

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Organization & Legal Info */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="rounded-lg bg-teal-500/10 p-2 text-teal-400">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Enterprise Identity</h2>
              <p className="text-xs text-slate-400">Legal entity designations and public-facing brand information.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="company-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-300">
                Company Display Name <span className="text-teal-400">*</span>
              </label>
              <input
                id="company-name"
                type="text"
                required
                value={settings.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Aleef Business Solutions"
                className="w-full min-h-[44px] sm:min-h-0 rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500"
              />
            </div>

            <div>
              <label htmlFor="company-legal-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-300">
                Registered Legal Name
              </label>
              <input
                id="company-legal-name"
                type="text"
                value={settings.legal_name}
                onChange={(e) => handleChange("legal_name", e.target.value)}
                placeholder="e.g. Aleef Information Technology LLC"
                className="w-full min-h-[44px] sm:min-h-0 rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500"
              />
            </div>

            <div>
              <label htmlFor="company-tax-id" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-300">
                Tax / VAT Registration ID
              </label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-3.5 sm:top-3 h-4 w-4 text-slate-500" aria-hidden="true" />
                <input
                  id="company-tax-id"
                  type="text"
                  value={settings.tax_id}
                  onChange={(e) => handleChange("tax_id", e.target.value)}
                  placeholder="e.g. 310492839200003"
                  className="w-full min-h-[44px] sm:min-h-0 rounded-lg border border-slate-700 bg-slate-950/60 py-2.5 pl-10 pr-3.5 text-sm font-mono text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="company-currency" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-300">
                  Base Currency
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-3.5 sm:top-3 h-4 w-4 text-slate-500" aria-hidden="true" />
                  <select
                    id="company-currency"
                    value={settings.currency}
                    onChange={(e) => handleChange("currency", e.target.value)}
                    className="w-full min-h-[44px] sm:min-h-0 rounded-lg border border-slate-700 bg-slate-950/60 py-2.5 pl-10 pr-3.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    <option value="SAR">SAR (Saudi Riyal)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                    <option value="QAR">QAR (Qatari Riyal)</option>
                    <option value="KWD">KWD (Kuwaiti Dinar)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="company-timezone" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-300">
                  Primary Timezone
                </label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-3.5 sm:top-3 h-4 w-4 text-slate-500" aria-hidden="true" />
                  <select
                    id="company-timezone"
                    value={settings.timezone}
                    onChange={(e) => handleChange("timezone", e.target.value)}
                    className="w-full min-h-[44px] sm:min-h-0 rounded-lg border border-slate-700 bg-slate-950/60 py-2.5 pl-10 pr-3.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    <option value="Asia/Riyadh (UTC+03:00)">Riyadh (UTC+03:00)</option>
                    <option value="Asia/Dubai (UTC+04:00)">Dubai (UTC+04:00)</option>
                    <option value="UTC (UTC+00:00)">UTC Standard</option>
                    <option value="Europe/London (UTC+01:00)">London (UTC+01:00)</option>
                    <option value="America/New_York (UTC-05:00)">New York (UTC-05:00)</option>
                    <option value="Asia/Singapore (UTC+08:00)">Singapore (UTC+08:00)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Contact & Corporate Address */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="rounded-lg bg-sky-500/10 p-2 text-sky-400">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Contact & Communications</h2>
              <p className="text-xs text-slate-400">Official channels for invoices, notifications, and client outreach.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="company-email" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-300">
                Official Email Address <span className="text-teal-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 sm:top-3 h-4 w-4 text-slate-500" aria-hidden="true" />
                <input
                  id="company-email"
                  type="email"
                  required
                  value={settings.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="contact@aleefcrm.com"
                  className="w-full min-h-[44px] sm:min-h-0 rounded-lg border border-slate-700 bg-slate-950/60 py-2.5 pl-10 pr-3.5 text-sm text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="company-phone" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-300">
                Corporate Telephone
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3.5 sm:top-3 h-4 w-4 text-slate-500" aria-hidden="true" />
                <input
                  id="company-phone"
                  type="text"
                  value={settings.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+966 11 400 9000"
                  className="w-full min-h-[44px] sm:min-h-0 rounded-lg border border-slate-700 bg-slate-950/60 py-2.5 pl-10 pr-3.5 text-sm text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="company-address" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-300">
                Headquarters Physical Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3.5 sm:top-3 h-4 w-4 text-slate-500" aria-hidden="true" />
                <textarea
                  id="company-address"
                  rows={2}
                  value={settings.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Tower 3, King Abdullah Financial District (KAFD), Riyadh, Saudi Arabia"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 py-2.5 pl-10 pr-3.5 text-sm text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Working Hours & Attendance Policy */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Work Hours & Attendance Policy</h2>
              <p className="text-xs text-slate-400">Standard operating shifts, grace allowances, and partial attendance limits.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="shift-start" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-300">
                Shift Start Time
              </label>
              <input
                id="shift-start"
                type="time"
                value={settings.working_hours_start}
                onChange={(e) => handleChange("working_hours_start", e.target.value)}
                className="w-full min-h-[44px] sm:min-h-0 rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500"
              />
              <p className="mt-1 text-[11px] text-slate-400">Official check-in commencement</p>
            </div>

            <div>
              <label htmlFor="shift-end" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-300">
                Shift End Time
              </label>
              <input
                id="shift-end"
                type="time"
                value={settings.working_hours_end}
                onChange={(e) => handleChange("working_hours_end", e.target.value)}
                className="w-full min-h-[44px] sm:min-h-0 rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500"
              />
              <p className="mt-1 text-[11px] text-slate-400">Official check-out conclusion</p>
            </div>

            <div>
              <label htmlFor="grace-period" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-300">
                Late Grace Period (Mins)
              </label>
              <input
                id="grace-period"
                type="number"
                min={0}
                max={60}
                value={settings.grace_period_minutes}
                onChange={(e) => handleChange("grace_period_minutes", parseInt(e.target.value) || 0)}
                className="w-full min-h-[44px] sm:min-h-0 rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500"
              />
              <p className="mt-1 text-[11px] text-slate-400">Minutes past start before marked &quot;Late&quot;</p>
            </div>

            <div>
              <label htmlFor="half-day-threshold" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-300">
                Half-Day Threshold (Hrs)
              </label>
              <input
                id="half-day-threshold"
                type="number"
                step="0.5"
                min={1}
                max={8}
                value={settings.half_day_threshold_hours}
                onChange={(e) => handleChange("half_day_threshold_hours", parseFloat(e.target.value) || 4)}
                className="w-full min-h-[44px] sm:min-h-0 rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500"
              />
              <p className="mt-1 text-[11px] text-slate-400">Minimum active hours for 0.5 day credit</p>
            </div>
          </div>
        </div>

        {/* Section 4: Automated Notification Dispatch */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
              <Bell className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Automated Notification Alerts</h2>
              <p className="text-xs text-slate-400">Trigger email and dashboard alerts when critical system events take place.</p>
            </div>
          </div>

          <div className="divide-y divide-slate-800/80">
            {/* Toggle 1: Leave Request */}
            <div className="flex items-center justify-between py-4">
              <div className="pr-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-200">Employee Leave Request Submissions</p>
                  {settings.notifications.email_on_leave_request && (
                    <span className="inline-flex items-center gap-1 rounded bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium text-teal-400">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Active
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  Notify administrators and reporting managers immediately when an employee applies for annual or medical leave.
                </p>
              </div>
              <label className="relative inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center">
                <input
                  type="checkbox"
                  aria-label="Notify on employee leave request submissions"
                  checked={settings.notifications.email_on_leave_request}
                  onChange={(e) => handleNotificationChange("email_on_leave_request", e.target.checked)}
                  className="peer sr-only focus-visible:outline-none"
                />
                <div className="h-6 w-11 rounded-full bg-slate-700 peer-checked:bg-teal-500 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500 peer-focus-visible:ring-offset-2 after:absolute after:left-[4px] sm:after:left-[2px] after:top-[12px] sm:after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
              </label>
            </div>

            {/* Toggle 2: Overdue Tasks */}
            <div className="flex items-center justify-between py-4">
              <div className="pr-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-200">Task Overdue SLA Breaches</p>
                  {settings.notifications.email_on_task_overdue && (
                    <span className="inline-flex items-center gap-1 rounded bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium text-teal-400">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Active
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  Dispatch reminder alerts when assigned Kanban project tasks exceed their scheduled due dates.
                </p>
              </div>
              <label className="relative inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center">
                <input
                  type="checkbox"
                  aria-label="Dispatch reminder alerts on task overdue SLA breaches"
                  checked={settings.notifications.email_on_task_overdue}
                  onChange={(e) => handleNotificationChange("email_on_task_overdue", e.target.checked)}
                  className="peer sr-only focus-visible:outline-none"
                />
                <div className="h-6 w-11 rounded-full bg-slate-700 peer-checked:bg-teal-500 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500 peer-focus-visible:ring-offset-2 after:absolute after:left-[4px] sm:after:left-[2px] after:top-[12px] sm:after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
              </label>
            </div>

            {/* Toggle 3: New Lead Creation */}
            <div className="flex items-center justify-between py-4">
              <div className="pr-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-200">New Prospect & Lead Captures</p>
                  {settings.notifications.email_on_new_lead && (
                    <span className="inline-flex items-center gap-1 rounded bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium text-teal-400">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Active
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  Alert business development reps whenever a new lead opportunity is ingested from website inquiries or API endpoints.
                </p>
              </div>
              <label className="relative inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center">
                <input
                  type="checkbox"
                  aria-label="Alert on new prospect and lead captures"
                  checked={settings.notifications.email_on_new_lead}
                  onChange={(e) => handleNotificationChange("email_on_new_lead", e.target.checked)}
                  className="peer sr-only focus-visible:outline-none"
                />
                <div className="h-6 w-11 rounded-full bg-slate-700 peer-checked:bg-teal-500 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500 peer-focus-visible:ring-offset-2 after:absolute after:left-[4px] sm:after:left-[2px] after:top-[12px] sm:after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
              </label>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex flex-wrap items-center justify-end gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50"
          >
            Revert Changes
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-2 rounded-lg bg-teal-500 px-5 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:opacity-50 shadow-sm"
          >
            {saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving Changes..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
