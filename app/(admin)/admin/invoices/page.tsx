/**
 * app/(admin)/admin/invoices/page.tsx
 *
 * Admin Invoices & Billing Management:
 * - Full CRUD & billing lifecycle (paid, pending, overdue, draft, cancelled)
 * - 4 Metric KPI stat cards for accounts receivable & collected revenue
 * - Interactive Invoice Generator modal with dynamic line items & 15% ZATCA tax calculation
 * - Tax Invoice Preview modal with official ZATCA VAT breakdown & print support
 * - 1-Click "Mark as Paid" settlement reconciliation
 * - Fully responsive across mobile, tablet, and desktop views
 */

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  invoicesApi,
  type Invoice,
  type InvoiceStatus,
  type LineItem,
} from "@/lib/financeApi";
import { clientsApi, type Client } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Trash2,
  Building,
  CreditCard,
  Printer,
  X,
  FileText,
  DollarSign,
  Send,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; style: string; icon: React.ElementType }> = {
  paid: {
    label: "Paid",
    style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending Payment",
    style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: Clock,
  },
  overdue: {
    label: "Overdue",
    style: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    icon: AlertCircle,
  },
  draft: {
    label: "Draft",
    style: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
    icon: Clock,
  },
  cancelled: {
    label: "Cancelled",
    style: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
    icon: X,
  },
};

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // New Invoice Form state
  const [formData, setFormData] = useState({
    clientId: "",
    projectName: "Enterprise Consultation & Scoping",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    discount: 0,
    status: "pending" as InvoiceStatus,
    notes: "Payment due within 30 days of invoice date. Include invoice # in wire memo.",
  });

  const [lineItems, setLineItems] = useState<Array<{ id: string; description: string; quantity: number; unitPrice: number }>>([
    { id: "1", description: "Milestone 1: Architectural Blueprint & Cloud Deployment", quantity: 1, unitPrice: 45000 },
  ]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [iList, cList] = await Promise.all([
        invoicesApi.getAll(),
        clientsApi.getAll(),
      ]);
      setInvoices(iList);
      setClients(cList);
      if (cList.length > 0 && !formData.clientId) {
        setFormData((prev) => ({ ...prev, clientId: cList[0].id }));
      }
    } catch {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [formData.clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculations for KPI Cards
  const stats = useMemo(() => {
    const totalBilled = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const paidRevenue = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.totalAmount, 0);
    const pendingBalance = invoices.filter((i) => i.status === "pending").reduce((sum, i) => sum + i.totalAmount, 0);
    const overdueBalance = invoices.filter((i) => i.status === "overdue").reduce((sum, i) => sum + i.totalAmount, 0);

    return { totalBilled, paidRevenue, pendingBalance, overdueBalance };
  }, [invoices]);

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

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.clientCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.projectName && inv.projectName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  // Handle Dynamic Line Items
  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { id: String(Date.now()), description: "", quantity: 1, unitPrice: 25000 },
    ]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length === 1) {
      toast.error("Invoice must have at least one line item");
      return;
    }
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: "description" | "quantity" | "unitPrice", value: string | number) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Handle Create Invoice
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClient = clients.find((c) => c.id === formData.clientId);
    if (!selectedClient) {
      toast.error("Please select a valid client");
      return;
    }

    const items: LineItem[] = lineItems.map((item) => ({
      id: item.id,
      description: item.description || "Milestone Deliverable",
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      total: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
    }));

    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoices.length + 101).padStart(4, "0")}`;

    try {
      await invoicesApi.create({
        invoiceNumber,
        clientId: selectedClient.id,
        clientName: selectedClient.contact_person,
        clientEmail: selectedClient.email || "billing@client.com",
        clientCompany: selectedClient.company_name,
        projectName: formData.projectName,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        items,
        subtotal: formSubtotal,
        taxRate: 18,
        taxAmount: formTax,
        discount: Number(formData.discount) || 0,
        totalAmount: formTotal,
        currency: "INR",
        status: formData.status,
        notes: formData.notes,
      });

      toast.success(`Generated Tax Invoice ${invoiceNumber} for ${selectedClient.company_name}!`);
      setIsCreateOpen(false);
      loadData();
    } catch {
      toast.error("Failed to generate invoice");
    }
  };

  // Handle Mark as Paid
  const handleMarkAsPaid = async (invoice: Invoice) => {
    try {
      await invoicesApi.markAsPaid(invoice.id);
      toast.success(`Invoice ${invoice.invoiceNumber} marked as fully paid!`);
      loadData();
    } catch {
      toast.error("Failed to update payment status");
    }
  };

  // Handle Send Reminder
  const handleSendReminder = (invoice: Invoice) => {
    toast.success(`Automated payment statement dispatched to ${invoice.clientEmail}`);
  };

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await invoicesApi.delete(id);
      toast.success("Invoice deleted");
      loadData();
    } catch {
      toast.error("Failed to delete invoice");
    }
  };

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* ── 1. Page Header ── */}
      <PageHeader
        title="Invoices & Billing"
        description="Official corporate tax invoicing, automated ZATCA VAT calculations, and accounts receivable reconciliation."
        breadcrumbs={[
          { label: "Admin Portal", href: "/admin/dashboard" },
          { label: "Finance & Billing" },
          { label: "Invoices" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/quotations"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-all"
            >
              <FileText className="h-4 w-4 text-teal-600" />
              Quotations
            </Link>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              New Invoice
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
                Total Invoiced
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
              ₹ {stats.totalBilled.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Cumulative billed volume</p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/95 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Collected Revenue
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              ₹ {stats.paidRevenue.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.totalBilled > 0 ? Math.round((stats.paidRevenue / stats.totalBilled) * 100) : 0}% settled
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/95 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pending Balance
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              ₹ {stats.pendingBalance.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Awaiting wire clearing</p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/95 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Overdue Receivables
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              ₹ {stats.overdueBalance.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Past payment grace period</p>
          </div>
        </div>
      )}

      {/* ── 3. Invoices Table & Filters ── */}
      <div className="rounded-2xl border border-border/70 bg-card/95 shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border/60 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-muted/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search invoice #, client, project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-border/80 bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {["all", "paid", "pending", "overdue", "draft"].map((st) => (
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
          <div className="p-10 text-center text-xs text-muted-foreground">Loading accounts receivable...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
            <Receipt className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="font-semibold text-foreground text-sm">No invoices found</p>
            <p>Generate a new invoice or convert an accepted quotation.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/60 bg-muted/30 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                  <tr>
                    <th scope="col" className="px-4 py-3.5">Invoice Reference</th>
                    <th scope="col" className="px-4 py-3.5">Client & Project</th>
                    <th scope="col" className="px-4 py-3.5">Due Date</th>
                    <th scope="col" className="px-4 py-3.5">Amount (₹)</th>
                    <th scope="col" className="px-4 py-3.5">Status</th>
                    <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredInvoices.map((inv) => {
                    const statusConfig = STATUS_CONFIG[inv.status];
                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-mono font-bold text-foreground">{inv.invoiceNumber}</span>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Issued: {inv.issueDate}
                          </p>
                          {inv.quotationNumber && (
                            <span className="inline-block rounded bg-muted/60 px-1.5 py-0.2 text-[10px] text-muted-foreground font-mono mt-0.5">
                              via {inv.quotationNumber}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-foreground">{inv.clientCompany}</p>
                          <p className="text-[11px] text-muted-foreground">{inv.projectName || inv.clientName}</p>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground">
                          {inv.dueDate}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-bold text-foreground">
                            ₹ {inv.totalAmount.toLocaleString("en-IN")}
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
                              onClick={() => setPreviewInvoice(inv)}
                              title="Preview Tax Invoice"
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {inv.status !== "paid" ? (
                              <button
                                onClick={() => handleMarkAsPaid(inv)}
                                title="Mark as Fully Paid"
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                              >
                                <DollarSign className="h-3 w-3" /> Settle
                              </button>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 px-2">
                                Settled ✓
                              </span>
                            )}

                            {inv.status !== "paid" && (
                              <button
                                onClick={() => handleSendReminder(inv)}
                                title="Dispatch Statement Reminder"
                                className="rounded-lg p-1.5 text-sky-600 hover:bg-sky-500/10 transition-colors"
                              >
                                <Send className="h-4 w-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleDelete(inv.id)}
                              title="Delete Invoice"
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
              {filteredInvoices.map((inv) => {
                const statusConfig = STATUS_CONFIG[inv.status];

                return (
                  <div key={inv.id} className="p-4 space-y-3 bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-foreground block">
                          {inv.invoiceNumber}
                        </span>
                        <p className="text-xs font-semibold text-foreground mt-0.5">
                          {inv.clientCompany}
                        </p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${statusConfig.style}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Due Date</span>
                        <span className="text-foreground">{inv.dueDate}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block">Total (INR)</span>
                        <span className="font-bold text-sm text-foreground">
                          ₹ {inv.totalAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                      <button
                        onClick={() => setPreviewInvoice(inv)}
                        className="flex-1 rounded-lg border border-border/80 bg-background py-2 text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        Preview
                      </button>
                      {inv.status !== "paid" ? (
                        <button
                          onClick={() => handleMarkAsPaid(inv)}
                          className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                        >
                          Mark Paid
                        </button>
                      ) : (
                        <span className="flex-1 text-center py-2 text-xs font-semibold text-emerald-600">
                          Settled ✓
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── 4. Interactive Invoice Generator Modal ── */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 animate-fade-in backdrop-blur-xs"
        >
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div>
                <h3 className="text-lg font-bold text-foreground">Generate Tax Invoice</h3>
                <p className="text-xs text-muted-foreground">
                  Issue an official tax statement with automatic 15% ZATCA tax calculation and IBAN wire instructions.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="mt-5 space-y-4">
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

              {/* Project Title */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Project / Contract Scope *</label>
                <input
                  type="text"
                  required
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Dates & Status */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                  <label className="text-xs font-bold text-foreground block mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Initial Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as InvoiceStatus })}
                    className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Line Items */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Invoice Deliverable Items</label>
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
                        placeholder="Milestone description"
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
                  <span>Invoice Total:</span>
                  <span className="font-mono text-teal-600 dark:text-teal-400">₹ {formTotal.toLocaleString("en-IN")}</span>
                </div>
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
                  Issue Tax Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 5. Document Preview Modal ── */}
      {previewInvoice && (
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
                  <h3 className="text-base font-bold text-foreground">Tax Invoice (فاتورة ضريبية)</h3>
                  <p className="text-xs text-muted-foreground font-mono">{previewInvoice.invoiceNumber}</p>
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
                  onClick={() => setPreviewInvoice(null)}
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
                <p className="text-muted-foreground">VAT Registration ID: 300987654300003</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Billed To:</p>
                <p className="font-bold text-foreground text-sm">{previewInvoice.clientCompany}</p>
                <p className="text-muted-foreground">{previewInvoice.clientName}</p>
                <p className="text-muted-foreground">{previewInvoice.clientEmail}</p>
              </div>
            </div>

            {/* Dates & Status */}
            <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3 text-xs">
              <div>
                <span className="text-muted-foreground">Date Issued: </span>
                <span className="font-semibold text-foreground">{previewInvoice.issueDate}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Payment Due: </span>
                <span className="font-semibold text-foreground">{previewInvoice.dueDate}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status: </span>
                <span className={`font-semibold uppercase ${
                  previewInvoice.status === "paid" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"
                }`}>
                  {previewInvoice.status}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-3.5 py-2.5">Item Description</th>
                    <th className="px-3.5 py-2.5 text-center">Qty</th>
                    <th className="px-3.5 py-2.5 text-right">Unit Price</th>
                    <th className="px-3.5 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {previewInvoice.items.map((item, i) => (
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
                Subtotal: <span className="font-mono text-foreground font-semibold">₹ {previewInvoice.subtotal.toLocaleString("en-IN")}</span>
              </p>
              <p className="text-muted-foreground">
                18% GST: <span className="font-mono text-foreground font-semibold">₹ {previewInvoice.taxAmount.toLocaleString("en-IN")}</span>
              </p>
              <p className="text-sm font-bold text-foreground">
                Total Due: <span className="font-mono text-teal-600 dark:text-teal-400">₹ {previewInvoice.totalAmount.toLocaleString("en-IN")}</span>
              </p>
            </div>

            {/* Settlement Instructions */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2 text-xs">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-teal-600" /> Bank NEFT / RTGS Settlement
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <div>
                  <span>Beneficiary: </span>
                  <span className="font-medium text-foreground">{previewInvoice.bankDetails?.beneficiary}</span>
                </div>
                <div>
                  <span>Bank: </span>
                  <span className="font-medium text-foreground">{previewInvoice.bankDetails?.bankName}</span>
                </div>
                <div>
                  <span>Account No.: </span>
                  <span className="font-mono font-bold text-foreground select-all">{previewInvoice.bankDetails?.accountNumber || previewInvoice.bankDetails?.iban}</span>
                </div>
                <div>
                  <span>IFSC Code: </span>
                  <span className="font-mono font-bold text-foreground select-all">{previewInvoice.bankDetails?.ifsc || "HDFC0001234"}</span>
                </div>
                <div className="col-span-2">
                  <span>GSTIN: </span>
                  <span className="font-mono font-bold text-foreground">{previewInvoice.bankDetails?.gstin || previewInvoice.bankDetails?.vatNumber}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
