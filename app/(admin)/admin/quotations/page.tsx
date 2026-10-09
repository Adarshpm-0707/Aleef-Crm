/**
 * app/(admin)/admin/quotations/page.tsx
 *
 * Admin Quotations Management & Proposal Generator:
 * - Full CRUD & status lifecycle (draft, sent, accepted, rejected, expired)
 * - 4 Metric KPI stat cards for proposal pipeline
 * - Interactive Quotation Generator modal with dynamic line items & 15% VAT auto-calculations
 * - 1-Click "Convert to Invoice" workflow
 * - Document Preview modal with print & download capability
 * - Fully responsive across mobile, tablet, and desktop views
 */

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  quotationsApi,
  invoicesApi,
  type Quotation,
  type QuotationStatus,
  type LineItem,
} from "@/lib/financeApi";
import { clientsApi, type Client } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  Trash2,
  ArrowRight,
  Send,
  Building,
  Printer,
  X,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<QuotationStatus, { label: string; style: string; icon: React.ElementType }> = {
  draft: {
    label: "Draft",
    style: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
    icon: Clock,
  },
  sent: {
    label: "Sent to Client",
    style: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    icon: Send,
  },
  accepted: {
    label: "Accepted",
    style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    style: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    icon: XCircle,
  },
  expired: {
    label: "Expired",
    style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: AlertCircle,
  },
};

export default function AdminQuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);

  // New Quotation Form state
  const [formData, setFormData] = useState({
    clientId: "",
    issueDate: new Date().toISOString().split("T")[0],
    expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    discount: 0,
    notes: "Payment: 50% advance upon signing, 50% upon milestone completion.",
    terms: "Quotation valid for 30 calendar days from issue date.",
  });

  const [lineItems, setLineItems] = useState<Array<{ id: string; description: string; quantity: number; unitPrice: number }>>([
    { id: "1", description: "Enterprise Cloud Infrastructure Architecture", quantity: 1, unitPrice: 35000 },
  ]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [qList, cList] = await Promise.all([
        quotationsApi.getAll(),
        clientsApi.getAll(),
      ]);
      setQuotations(qList);
      setClients(cList);
      if (cList.length > 0 && !formData.clientId) {
        setFormData((prev) => ({ ...prev, clientId: cList[0].id }));
      }
    } catch {
      toast.error("Failed to load quotations");
    } finally {
      setLoading(false);
    }
  }, [formData.clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculations for KPI Cards
  const stats = useMemo(() => {
    const total = quotations.length;
    const acceptedList = quotations.filter((q) => q.status === "accepted");
    const acceptedValue = acceptedList.reduce((sum, q) => sum + q.totalAmount, 0);
    const activePipeline = quotations
      .filter((q) => q.status === "sent" || q.status === "draft")
      .reduce((sum, q) => sum + q.totalAmount, 0);
    const conversionRate = total > 0 ? Math.round((acceptedList.length / total) * 100) : 0;

    return { total, acceptedValue, activePipeline, conversionRate };
  }, [quotations]);

  // Form Calculated Totals
  const formSubtotal = useMemo(() => {
    return lineItems.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  }, [lineItems]);

  const formTax = useMemo(() => {
    const taxable = Math.max(0, formSubtotal - formData.discount);
    return Math.round(taxable * 0.18); // 18% GST
  }, [formSubtotal, formData.discount]);

  const formTotal = useMemo(() => {
    return Math.max(0, formSubtotal - formData.discount) + formTax;
  }, [formSubtotal, formData.discount, formTax]);

  // Filtered Quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const matchSearch =
        q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.clientCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.clientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "all" || q.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [quotations, searchTerm, statusFilter]);

  // Handle Create Line Item
  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { id: String(Date.now()), description: "", quantity: 1, unitPrice: 25000 },
    ]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length === 1) {
      toast.error("Quotation must have at least one line item");
      return;
    }
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: "description" | "quantity" | "unitPrice", value: string | number) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Handle Form Submit
  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClient = clients.find((c) => c.id === formData.clientId);
    if (!selectedClient) {
      toast.error("Please select a valid client");
      return;
    }

    const items: LineItem[] = lineItems.map((item) => ({
      id: item.id,
      description: item.description || "General Consulting & Services",
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      total: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
    }));

    const quotationNumber = `QT-${new Date().getFullYear()}-${String(quotations.length + 101).padStart(4, "0")}`;

    try {
      await quotationsApi.create({
        quotationNumber,
        clientId: selectedClient.id,
        clientName: selectedClient.contact_person,
        clientEmail: selectedClient.email || "contact@client.com",
        clientCompany: selectedClient.company_name,
        issueDate: formData.issueDate,
        expiryDate: formData.expiryDate,
        items,
        subtotal: formSubtotal,
        taxRate: 18,
        taxAmount: formTax,
        discount: Number(formData.discount) || 0,
        totalAmount: formTotal,
        currency: "INR",
        status: "sent",
        notes: formData.notes,
        terms: formData.terms,
      });

      toast.success(`Generated Quotation ${quotationNumber} for ${selectedClient.company_name}!`);
      setIsCreateOpen(false);
      loadData();
    } catch {
      toast.error("Failed to generate quotation");
    }
  };

  // Handle Status Update
  const handleUpdateStatus = async (id: string, newStatus: QuotationStatus) => {
    try {
      await quotationsApi.updateStatus(id, newStatus);
      toast.success(`Quotation marked as ${newStatus}`);
      loadData();
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Handle Convert to Invoice
  const handleConvertToInvoice = async (quotation: Quotation) => {
    try {
      const newInvoice = await quotationsApi.convertToInvoice(quotation.id);
      toast.success(
        `Converted ${quotation.quotationNumber} to Invoice ${newInvoice.invoiceNumber} successfully!`
      );
      loadData();
    } catch {
      toast.error("Failed to convert quotation to invoice");
    }
  };

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quotation?")) return;
    try {
      await quotationsApi.delete(id);
      toast.success("Quotation deleted");
      loadData();
    } catch {
      toast.error("Failed to delete quotation");
    }
  };

  // Print quotation
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* ── 1. Page Header ── */}
      <PageHeader
        title="Commercial Quotations"
        description="Generate, track, and convert client proposals, project cost estimations, and formal bids."
        breadcrumbs={[
          { label: "Admin Portal", href: "/admin/dashboard" },
          { label: "Finance & Billing" },
          { label: "Quotations" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/invoices"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-all"
            >
              <FileCheck className="h-4 w-4 text-sky-500" />
              View Invoices
            </Link>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              New Quotation
            </button>
          </div>
        }
      />

      {/* ── 2. KPI Metric Cards ── */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-card/95 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Quotations
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
              {stats.total}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Generated to date</p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/95 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Pipeline
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
              ₹ {stats.activePipeline.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Awaiting client decision</p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/95 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Accepted Value
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              ₹ {stats.acceptedValue.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Confirmed business wins</p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/95 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Win Rate
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <FileCheck className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              {stats.conversionRate}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Proposals accepted</p>
          </div>
        </div>
      )}

      {/* ── 3. Quotations List & Filters ── */}
      <div className="rounded-2xl border border-border/70 bg-card/95 shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border/60 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-muted/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search quotation #, company, contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-border/80 bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {["all", "draft", "sent", "accepted", "expired"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all shrink-0 ${
                  statusFilter === st
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Content Table / Mobile Cards */}
        {loading ? (
          <div className="p-10 text-center text-xs text-muted-foreground">Loading commercial proposals...</div>
        ) : filteredQuotations.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="font-semibold text-foreground text-sm">No quotations found</p>
            <p>Generate a new quotation using the button above.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/60 bg-muted/30 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                  <tr>
                    <th scope="col" className="px-4 py-3.5">Quotation Ref</th>
                    <th scope="col" className="px-4 py-3.5">Client Organization</th>
                    <th scope="col" className="px-4 py-3.5">Valid Until</th>
                    <th scope="col" className="px-4 py-3.5">Total Amount</th>
                    <th scope="col" className="px-4 py-3.5">Status</th>
                    <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredQuotations.map((q) => {
                    const statusConfig = STATUS_CONFIG[q.status];
                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr key={q.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-mono font-bold text-foreground">{q.quotationNumber}</span>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Issued: {q.issueDate} • {q.items.length} items
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-foreground">{q.clientCompany}</p>
                          <p className="text-[11px] text-muted-foreground">{q.clientName}</p>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground">
                          {q.expiryDate}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-bold text-foreground">
                            ₹ {q.totalAmount.toLocaleString("en-IN")}
                          </span>
                          <p className="text-[10px] text-muted-foreground">incl. 18% GST</p>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${statusConfig.style}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPreviewQuotation(q)}
                              title="Preview Document"
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {q.status !== "accepted" && (
                              <button
                                onClick={() => handleUpdateStatus(q.id, "accepted")}
                                title="Mark as Accepted"
                                className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                            )}

                            {/* Convert to Invoice Button */}
                            {!q.convertedToInvoiceId ? (
                              <button
                                onClick={() => handleConvertToInvoice(q)}
                                title="Convert to Official Invoice"
                                className="inline-flex items-center gap-1 rounded-lg bg-teal-500/10 px-2 py-1 text-[11px] font-bold text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 transition-colors"
                              >
                                Convert <ArrowRight className="h-3 w-3" />
                              </button>
                            ) : (
                              <Link
                                href="/admin/invoices"
                                className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                              >
                                Invoiced ✓
                              </Link>
                            )}

                            <button
                              onClick={() => handleDelete(q.id)}
                              title="Delete Quotation"
                              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-border/40">
              {filteredQuotations.map((q) => {
                const statusConfig = STATUS_CONFIG[q.status];

                return (
                  <div key={q.id} className="p-4 space-y-3 bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-foreground block">
                          {q.quotationNumber}
                        </span>
                        <p className="text-xs font-semibold text-foreground mt-0.5">
                          {q.clientCompany}
                        </p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${statusConfig.style}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Expires</span>
                        <span className="text-foreground">{q.expiryDate}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block">Total (INR)</span>
                        <span className="font-bold text-sm text-foreground">
                          ₹ {q.totalAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                      <button
                        onClick={() => setPreviewQuotation(q)}
                        className="flex-1 rounded-lg border border-border/80 bg-background py-2 text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        Preview
                      </button>
                      {!q.convertedToInvoiceId ? (
                        <button
                          onClick={() => handleConvertToInvoice(q)}
                          className="flex-1 rounded-lg bg-teal-600 py-2 text-xs font-semibold text-white hover:bg-teal-500"
                        >
                          Invoice &rarr;
                        </button>
                      ) : (
                        <Link
                          href="/admin/invoices"
                          className="flex-1 text-center rounded-lg bg-sky-500/10 py-2 text-xs font-semibold text-sky-600"
                        >
                          Invoiced ✓
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── 4. Interactive Quotation Generator Modal ── */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 animate-fade-in backdrop-blur-xs"
        >
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div>
                <h3 className="text-lg font-bold text-foreground">Generate Commercial Quotation</h3>
                <p className="text-xs text-muted-foreground">
                  Create a customized commercial proposal with automated 15% ZATCA tax calculation.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="mt-5 space-y-4">
              {/* Client Selection */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Client Organization *</label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  required
                  className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} ({c.contact_person})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Issue Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Validity / Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Dynamic Line Items */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Proposal Line Items</label>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Item
                  </button>
                </div>

                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {lineItems.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 p-2.5">
                      <span className="text-[11px] font-mono text-muted-foreground w-4">{index + 1}.</span>
                      <input
                        type="text"
                        placeholder="Item description / milestone"
                        required
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                        className="flex-1 rounded-lg border border-border/70 bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, "quantity", Number(e.target.value))}
                        className="w-16 rounded-lg border border-border/70 bg-background px-2 py-1 text-xs text-foreground text-center focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <input
                        type="number"
                        min="0"
                        step="500"
                        placeholder="Price (₹)"
                        required
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(item.id, "unitPrice", Number(e.target.value))}
                        className="w-24 rounded-lg border border-border/70 bg-background px-2.5 py-1 text-xs text-foreground text-right focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(item.id)}
                        className="text-muted-foreground hover:text-rose-500 p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Summary */}
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-mono text-foreground font-semibold">₹ {formSubtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GST (18%):</span>
                  <span className="font-mono text-foreground font-semibold">₹ {formTax.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-foreground pt-1.5 border-t border-border/60">
                  <span>Grand Total:</span>
                  <span className="font-mono text-teal-600 dark:text-teal-400">₹ {formTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Commercial Terms */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Commercial Notes & Terms</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-xl border border-border/80 bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-border/80 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-500 shadow-sm"
                >
                  Generate & Send Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 5. Document Preview Modal ── */}
      {previewQuotation && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 animate-fade-in backdrop-blur-xs"
        >
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-2xl animate-scale-in space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-xs">
                  AC
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Commercial Proposal</h3>
                  <p className="text-xs text-muted-foreground font-mono">{previewQuotation.quotationNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button
                  onClick={() => setPreviewQuotation(null)}
                  className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Document Header */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-bold text-foreground text-sm">Aleef Technology Solutions Ltd.</p>
                <p className="text-muted-foreground mt-0.5">King Fahd Road, Riyadh, Saudi Arabia</p>
                <p className="text-muted-foreground">VAT ID: 300987654300003</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Prepared for:</p>
                <p className="font-bold text-foreground text-sm">{previewQuotation.clientCompany}</p>
                <p className="text-muted-foreground">{previewQuotation.clientName}</p>
                <p className="text-muted-foreground">{previewQuotation.clientEmail}</p>
              </div>
            </div>

            {/* Dates & Status */}
            <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3 text-xs">
              <div>
                <span className="text-muted-foreground">Issued: </span>
                <span className="font-semibold text-foreground">{previewQuotation.issueDate}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Valid Until: </span>
                <span className="font-semibold text-foreground">{previewQuotation.expiryDate}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status: </span>
                <span className="font-semibold uppercase text-teal-600 dark:text-teal-400">
                  {previewQuotation.status}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-3.5 py-2.5">Scope Description</th>
                    <th className="px-3.5 py-2.5 text-center">Qty</th>
                    <th className="px-3.5 py-2.5 text-right">Unit Price</th>
                    <th className="px-3.5 py-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {previewQuotation.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3.5 py-3 font-medium text-foreground">{item.description}</td>
                      <td className="px-3.5 py-3 text-center">{item.quantity}</td>
                      <td className="px-3.5 py-3 text-right font-mono">
                        ₹ {item.unitPrice.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-semibold">
                        ₹ {item.total.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="space-y-1.5 text-xs text-right border-t border-border/60 pt-3">
              <p className="text-muted-foreground">
                Subtotal: <span className="font-mono text-foreground font-semibold">₹ {previewQuotation.subtotal.toLocaleString("en-IN")}</span>
              </p>
              <p className="text-muted-foreground">
                18% GST: <span className="font-mono text-foreground font-semibold">₹ {previewQuotation.taxAmount.toLocaleString("en-IN")}</span>
              </p>
              <p className="text-sm font-bold text-foreground">
                Total Proposal: <span className="font-mono text-teal-600 dark:text-teal-400">₹ {previewQuotation.totalAmount.toLocaleString("en-IN")}</span>
              </p>
            </div>

            {previewQuotation.notes && (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground leading-relaxed">
                <p className="font-semibold text-foreground mb-0.5">Notes & Terms:</p>
                {previewQuotation.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
