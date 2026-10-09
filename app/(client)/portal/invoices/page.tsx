/**
 * app/(client)/portal/invoices/page.tsx
 *
 * Client Portal Invoices & Billing Center:
 *  - Financial overview of invoices and payments for active client
 *  - Metric cards: Total Invoiced, Paid, Pending, Upcoming payment schedule
 *  - Filterable invoice table (Paid, Pending, Overdue) with dual desktop table / mobile card layout
 *  - PDF receipt / statement download simulation
 *  - Bank wire & VAT details card
 */

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useCurrentClient } from "@/lib/permissions/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCardSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import {
  Download,
  CreditCard,
  CheckCircle2,
  Clock,
  Search,
  Receipt,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface ClientInvoice {
  id: string;
  invoiceNumber: string;
  projectName: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "overdue";
  description: string;
}

const SAMPLE_INVOICES_BY_CLIENT: Record<string, ClientInvoice[]> = {
  "c-1": [
    {
      id: "inv-101",
      invoiceNumber: "INV-2026-0041",
      projectName: "Fleet Telematics Integration",
      issueDate: "2026-01-20",
      dueDate: "2026-02-20",
      amount: 350000,
      currency: "INR",
      status: "paid",
      description: "Milestone 1: Architectural blueprint & Kafka ingestion design",
    },
    {
      id: "inv-102",
      invoiceNumber: "INV-2026-0082",
      projectName: "Fleet Telematics Integration",
      issueDate: "2026-02-25",
      dueDate: "2026-03-25",
      amount: 420000,
      currency: "INR",
      status: "paid",
      description: "Milestone 2: ERP connector & geofencing engine",
    },
    {
      id: "inv-103",
      invoiceNumber: "INV-2026-0115",
      projectName: "Automated Dispatch Optimization",
      issueDate: "2026-03-01",
      dueDate: "2026-03-31",
      amount: 380000,
      currency: "INR",
      status: "pending",
      description: "Milestone 1: Route scheduling algorithms & traffic model benchmarking",
    },
  ],
  "c-2": [
    {
      id: "inv-201",
      invoiceNumber: "INV-2026-0055",
      projectName: "Health Records Cloud Sync",
      issueDate: "2026-02-05",
      dueDate: "2026-03-05",
      amount: 450000,
      currency: "INR",
      status: "paid",
      description: "Milestone 1: Security compliance boundary & auth service",
    },
    {
      id: "inv-202",
      invoiceNumber: "INV-2026-0099",
      projectName: "Health Records Cloud Sync",
      issueDate: "2026-03-02",
      dueDate: "2026-04-02",
      amount: 480000,
      currency: "INR",
      status: "pending",
      description: "Milestone 2: FHIR schema validation microservice & audit logs",
    },
  ],
  "c-3": [
    {
      id: "inv-301",
      invoiceNumber: "INV-2026-0067",
      projectName: "AML & KYC Verification Portal",
      issueDate: "2026-02-26",
      dueDate: "2026-03-26",
      amount: 550000,
      currency: "INR",
      status: "pending",
      description: "Project Initiation & Document verification sandbox integration",
    },
  ],
};

const STATUS_PILLS: Record<"paid" | "pending" | "overdue", { label: string; style: string }> = {
  paid: {
    label: "Paid",
    style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  pending: {
    label: "Pending",
    style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  overdue: {
    label: "Overdue",
    style: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
};

export default function ClientInvoicesPage() {
  const { client } = useCurrentClient();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [client.clientId]);

  const rawInvoices = useMemo(() => {
    return SAMPLE_INVOICES_BY_CLIENT[client.clientId] || [
      {
        id: `inv-${client.clientId}-1`,
        invoiceNumber: "INV-2026-0001",
        projectName: "Enterprise Consultation & Scoping",
        issueDate: "2026-02-01",
        dueDate: "2026-03-01",
        amount: 250000,
        currency: "INR",
        status: "paid",
        description: "Initial discovery and architecture mapping",
      },
    ];
  }, [client.clientId]);

  // Calculations
  const currency = rawInvoices[0]?.currency || "INR";
  const totalBilled = rawInvoices.reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = rawInvoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.amount, 0);
  const totalPending = rawInvoices.filter((i) => i.status === "pending" || i.status === "overdue").reduce((sum, i) => sum + i.amount, 0);

  const filteredInvoices = useMemo(() => {
    return rawInvoices.filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rawInvoices, searchTerm, statusFilter]);

  const handleDownloadInvoice = (inv: ClientInvoice) => {
    toast.success(`Generated official PDF for ${inv.invoiceNumber}`);
    // Simulate dynamic file download
    const dummyText = `ALEEF CRM TAX INVOICE\n\nInvoice: ${inv.invoiceNumber}\nClient: ${client.companyName}\nProject: ${inv.projectName}\nAmount: ${inv.amount.toLocaleString()} ${inv.currency}\nStatus: ${inv.status.toUpperCase()}\nIssue Date: ${inv.issueDate}\nDue Date: ${inv.dueDate}\n\nThank you for your business!`;
    const blob = new Blob([dummyText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inv.invoiceNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices & Billing"
        description={`Manage statements, view payment history, and download official receipts for ${client.companyName}`}
        breadcrumbs={[
          { label: "Client Portal", href: "/portal/dashboard" },
          { label: "Invoices" },
        ]}
      />

      {/* Metric Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Total Billed */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Invoiced
              </p>
              <div className="rounded-lg bg-sky-500/10 p-2 text-sky-500 dark:text-sky-400">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {currency === "INR" ? "₹" : currency} {totalBilled.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Across {rawInvoices.length} project statements
            </p>
          </div>

          {/* Paid to Date */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Paid to Date
              </p>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {currency === "INR" ? "₹" : currency} {totalPaid.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {Math.round((totalPaid / (totalBilled || 1)) * 100)}% settled
            </p>
          </div>

          {/* Outstanding / Pending */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pending Balance
              </p>
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {currency === "INR" ? "₹" : currency} {totalPending.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Payable via NEFT / RTGS or online gateway
            </p>
          </div>
        </div>
      )}

      {/* Main Section: Invoices Table + Bank Wire Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Invoices List (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            {/* Filter Toolbar */}
            <div className="p-4 border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-muted/20">
              <div className="relative flex-1 max-w-sm">
                <label htmlFor="invoice-search" className="sr-only">
                  Search invoices by number, project, or description
                </label>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  id="invoice-search"
                  type="text"
                  placeholder="Search by invoice # or project..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 text-xs text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 sm:gap-1 overflow-x-auto pb-1 sm:pb-0" role="tablist" aria-label="Invoice status filter">
                {["all", "paid", "pending"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === status}
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-lg px-3 py-2 sm:py-1 min-h-[44px] sm:min-h-0 text-xs font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 shrink-0 ${
                      statusFilter === status
                        ? "bg-sky-500 text-white shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Invoices Display */}
            {loading ? (
              <div className="p-4">
                <TableSkeleton rows={4} columns={5} />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="font-semibold text-foreground text-sm">No invoices found</p>
                <p className="mt-1">Try adjusting your search query or status filter.</p>
              </div>
            ) : (
              <>
                {/* Desktop View: Responsive Table (hidden on mobile) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <caption className="sr-only">List of project invoices and payment receipts</caption>
                    <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                      <tr>
                        <th scope="col" className="px-4 py-3">Invoice Details</th>
                        <th scope="col" className="px-4 py-3">Dates</th>
                        <th scope="col" className="px-4 py-3">Amount</th>
                        <th scope="col" className="px-4 py-3">Status</th>
                        <th scope="col" className="px-4 py-3 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredInvoices.map((inv) => {
                        const statusConfig = STATUS_PILLS[inv.status];

                        return (
                          <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3.5">
                              <span className="font-mono font-bold text-foreground">
                                {inv.invoiceNumber}
                              </span>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {inv.projectName}
                              </p>
                              <p className="text-[10px] text-muted-foreground line-clamp-1 italic mt-0.5">
                                {inv.description}
                              </p>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground">
                              <p>Issued: {inv.issueDate}</p>
                              <p className="text-[10px]">Due: {inv.dueDate}</p>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="font-bold text-foreground">
                                {inv.currency === "INR" ? "₹" : inv.currency} {inv.amount.toLocaleString("en-IN")}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${statusConfig.style}`}>
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap text-right">
                              <button
                                type="button"
                                onClick={() => handleDownloadInvoice(inv)}
                                aria-label={`Download PDF receipt for ${inv.invoiceNumber}`}
                                className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-sky-500 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                              >
                                <Download className="h-3 w-3" /> PDF
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: Stacked Cards (below md breakpoint) */}
                <div className="md:hidden divide-y divide-border">
                  {filteredInvoices.map((inv) => {
                    const statusConfig = STATUS_PILLS[inv.status];

                    return (
                      <div key={inv.id} className="p-4 space-y-3 bg-card">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-sm font-bold text-foreground block">
                              {inv.invoiceNumber}
                            </span>
                            <p className="text-xs font-medium text-foreground mt-0.5">
                              {inv.projectName}
                            </p>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border shrink-0 ${statusConfig.style}`}>
                            {statusConfig.label}
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                          {inv.description}
                        </p>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                              Issue / Due Date
                            </span>
                            <span className="text-foreground mt-0.5 block">
                              {inv.issueDate} / {inv.dueDate}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                              Total Amount
                            </span>
                            <span className="font-bold text-sm text-foreground mt-0.5 block">
                              {inv.currency === "INR" ? "₹" : inv.currency} {inv.amount.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDownloadInvoice(inv)}
                          className="w-full min-h-[44px] flex items-center justify-center gap-1.5 rounded-lg bg-muted/60 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-sky-500 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                        >
                          <Download className="h-4 w-4" /> Download PDF Receipt
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bank Wire & Payment Instructions (1 Col) */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-sky-500 dark:text-sky-400" /> NEFT / RTGS Settlement Instructions
            </h3>

            <div className="space-y-3 text-xs leading-relaxed">
              <div>
                <p className="text-muted-foreground">Beneficiary Name</p>
                <p className="font-bold text-foreground">Aleef Technology Solutions Pvt. Ltd.</p>
              </div>

              <div>
                <p className="text-muted-foreground">Bank Name</p>
                <p className="font-medium text-foreground">HDFC Bank Ltd.</p>
              </div>

              <div>
                <p className="text-muted-foreground">Account Number</p>
                <p className="font-mono text-xs bg-muted/50 p-2 rounded font-bold text-foreground select-all mt-0.5">
                  50200089234156
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">IFSC Code</p>
                <p className="font-mono text-xs text-foreground font-semibold">HDFC0001234</p>
              </div>

              <div>
                <p className="text-muted-foreground">GSTIN Tax Registration ID</p>
                <p className="font-mono text-xs text-foreground font-semibold">27AAPCA1234F1Z5</p>
              </div>
            </div>

            <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 p-3 text-[11px] text-muted-foreground leading-relaxed">
              💡 Please include your <span className="font-semibold text-foreground">Invoice Number</span> in the wire transfer memo to ensure automatic credit reconciliation.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
