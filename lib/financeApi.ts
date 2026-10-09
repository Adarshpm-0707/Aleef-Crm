/**
 * lib/financeApi.ts
 *
 * Finance, Quotations & Invoicing service layer for Aleef CRM.
 * Provides typed methods, realistic business seed records, full CRUD,
 * status transitions, quotation-to-invoice conversion, and localStorage persistence.
 */

export type QuotationStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";
export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue" | "cancelled";

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  issueDate: string;
  expiryDate: string;
  items: LineItem[];
  subtotal: number;
  taxRate: number; // e.g., 15 for 15% VAT
  taxAmount: number;
  discount: number;
  totalAmount: number;
  currency: string;
  status: QuotationStatus;
  notes?: string;
  terms?: string;
  convertedToInvoiceId?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  quotationId?: string;
  quotationNumber?: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  projectName?: string;
  issueDate: string;
  dueDate: string;
  items: LineItem[];
  subtotal: number;
  taxRate: number; // 15% VAT
  taxAmount: number;
  discount: number;
  totalAmount: number;
  amountPaid: number;
  currency: string;
  status: InvoiceStatus;
  paymentMethod?: string;
  paidAt?: string;
  notes?: string;
  bankDetails?: {
    beneficiary: string;
    bankName: string;
    accountNumber?: string;
    ifsc?: string;
    gstin?: string;
    branch?: string;
    iban?: string;
    swift?: string;
    vatNumber?: string;
  };
  createdAt: string;
}

const DEFAULT_BANK_DETAILS = {
  beneficiary: "Aleef Technology Solutions Pvt. Ltd.",
  bankName: "HDFC Bank Ltd.",
  accountNumber: "50200089234156",
  ifsc: "HDFC0001234",
  gstin: "27AAPCA1234F1Z5",
  branch: "BKC Commercial Hub, Mumbai",
  iban: "IN56 HDFC 0001 2345 6789 01",
  swift: "HDFCINBBXXX",
  vatNumber: "27AAPCA1234F1Z5",
};

// Seed Quotations
const SEED_QUOTATIONS: Quotation[] = [
  {
    id: "qt-101",
    quotationNumber: "QT-2026-0041",
    clientId: "c-1",
    clientName: "Farid Mansoor",
    clientEmail: "farid@apexlogistics.sa",
    clientCompany: "Apex Logistics",
    issueDate: "2026-03-01",
    expiryDate: "2026-03-31",
    items: [
      {
        id: "item-1",
        description: "Fleet GPS Telematics Cloud Integration Architecture",
        quantity: 1,
        unitPrice: 350000,
        total: 350000,
      },
      {
        id: "item-2",
        description: "Real-time Kafka Event Streaming Broker Setup",
        quantity: 1,
        unitPrice: 150000,
        total: 150000,
      },
    ],
    subtotal: 500000,
    taxRate: 18,
    taxAmount: 90000,
    discount: 0,
    totalAmount: 590000,
    currency: "INR",
    status: "accepted",
    convertedToInvoiceId: "inv-101",
    notes: "Includes 90 days hypercare support post-launch.",
    terms: "Payment schedule: 50% advance upon contract signing, 50% upon final UAT delivery.",
    createdAt: "2026-03-01T09:00:00Z",
  },
  {
    id: "qt-102",
    quotationNumber: "QT-2026-0052",
    clientId: "c-2",
    clientName: "Dr. Salma Al-Husseini",
    clientEmail: "salma@alnoorhealth.sa",
    clientCompany: "Al-Noor Healthcare Group",
    issueDate: "2026-03-10",
    expiryDate: "2026-04-10",
    items: [
      {
        id: "item-1",
        description: "FHIR HIPAA Patient Cloud Sync Gateway",
        quantity: 1,
        unitPrice: 420000,
        total: 420000,
      },
      {
        id: "item-2",
        description: "Health Platform End-to-End Encryption Boundary",
        quantity: 1,
        unitPrice: 180000,
        total: 180000,
      },
    ],
    subtotal: 600000,
    taxRate: 18,
    taxAmount: 108000,
    discount: 25000,
    totalAmount: 683000,
    currency: "INR",
    status: "sent",
    notes: "Awaiting approval from procurement committee.",
    terms: "Net 30 days upon invoice issuance.",
    createdAt: "2026-03-10T11:30:00Z",
  },
  {
    id: "qt-103",
    quotationNumber: "QT-2026-0063",
    clientId: "c-3",
    clientName: "Tariq Bin Ziyad",
    clientEmail: "tariq@oasisfintech.ae",
    clientCompany: "Oasis FinTech Labs",
    issueDate: "2026-03-15",
    expiryDate: "2026-04-15",
    items: [
      {
        id: "item-1",
        description: "AML Transaction Screening Microservice & KYC Integration",
        quantity: 1,
        unitPrice: 650000,
        total: 650000,
      },
    ],
    subtotal: 650000,
    taxRate: 18,
    taxAmount: 117000,
    discount: 0,
    totalAmount: 767000,
    currency: "INR",
    status: "draft",
    notes: "Internal preliminary estimation for banking partner.",
    terms: "Quotation valid for 30 calendar days from issue date.",
    createdAt: "2026-03-15T14:15:00Z",
  },
  {
    id: "qt-104",
    quotationNumber: "QT-2026-0074",
    clientId: "c-4",
    clientName: "Hanan Al-Ghamdi",
    clientEmail: "hanan@redsearetail.com",
    clientCompany: "Red Sea Retail Consortium",
    issueDate: "2026-02-15",
    expiryDate: "2026-03-15",
    items: [
      {
        id: "item-1",
        description: "Omnichannel POS Inventory Sync Service",
        quantity: 1,
        unitPrice: 280000,
        total: 280000,
      },
    ],
    subtotal: 280000,
    taxRate: 18,
    taxAmount: 50400,
    discount: 0,
    totalAmount: 330400,
    currency: "INR",
    status: "expired",
    notes: "Expired proposal - client requested renewed scope for Q3.",
    terms: "Standard commercial contract terms.",
    createdAt: "2026-02-15T10:00:00Z",
  },
];

// Seed Invoices
const SEED_INVOICES: Invoice[] = [
  {
    id: "inv-101",
    invoiceNumber: "INV-2026-0041",
    quotationId: "qt-101",
    quotationNumber: "QT-2026-0041",
    clientId: "c-1",
    clientName: "Farid Mansoor",
    clientEmail: "farid@apexlogistics.sa",
    clientCompany: "Apex Logistics",
    projectName: "Fleet Telematics Integration",
    issueDate: "2026-01-20",
    dueDate: "2026-02-20",
    items: [
      {
        id: "inv-item-1",
        description: "Milestone 1: Architectural blueprint & Kafka ingestion design",
        quantity: 1,
        unitPrice: 350000,
        total: 350000,
      },
    ],
    subtotal: 350000,
    taxRate: 18,
    taxAmount: 63000,
    discount: 0,
    totalAmount: 413000,
    amountPaid: 413000,
    currency: "INR",
    status: "paid",
    paymentMethod: "NEFT / RTGS Transfer",
    paidAt: "2026-02-15T11:20:00Z",
    notes: "Settled via corporate net banking. UTR: HDFCN26045982134.",
    bankDetails: DEFAULT_BANK_DETAILS,
    createdAt: "2026-01-20T08:00:00Z",
  },
  {
    id: "inv-102",
    invoiceNumber: "INV-2026-0082",
    clientId: "c-1",
    clientName: "Farid Mansoor",
    clientEmail: "farid@apexlogistics.sa",
    clientCompany: "Apex Logistics",
    projectName: "Fleet Telematics Integration",
    issueDate: "2026-02-25",
    dueDate: "2026-03-25",
    items: [
      {
        id: "inv-item-2",
        description: "Milestone 2: ERP connector & geofencing engine",
        quantity: 1,
        unitPrice: 420000,
        total: 420000,
      },
    ],
    subtotal: 420000,
    taxRate: 18,
    taxAmount: 75600,
    discount: 0,
    totalAmount: 495600,
    amountPaid: 495600,
    currency: "INR",
    status: "paid",
    paymentMethod: "NEFT / RTGS Transfer",
    paidAt: "2026-03-20T14:40:00Z",
    notes: "Milestone signoff approved by client CTO. UTR: HDFCN26079143820.",
    bankDetails: DEFAULT_BANK_DETAILS,
    createdAt: "2026-02-25T10:15:00Z",
  },
  {
    id: "inv-103",
    invoiceNumber: "INV-2026-0115",
    clientId: "c-1",
    clientName: "Farid Mansoor",
    clientEmail: "farid@apexlogistics.sa",
    clientCompany: "Apex Logistics",
    projectName: "Automated Dispatch Optimization",
    issueDate: "2026-03-01",
    dueDate: "2026-03-31",
    items: [
      {
        id: "inv-item-3",
        description: "Milestone 1: Route scheduling algorithms & traffic model benchmarking",
        quantity: 1,
        unitPrice: 380000,
        total: 380000,
      },
    ],
    subtotal: 380000,
    taxRate: 18,
    taxAmount: 68400,
    discount: 0,
    totalAmount: 448400,
    amountPaid: 0,
    currency: "INR",
    status: "overdue",
    notes: "Automated payment reminder sent on April 2nd.",
    bankDetails: DEFAULT_BANK_DETAILS,
    createdAt: "2026-03-01T09:00:00Z",
  },
  {
    id: "inv-104",
    invoiceNumber: "INV-2026-0142",
    clientId: "c-2",
    clientName: "Dr. Salma Al-Husseini",
    clientEmail: "salma@alnoorhealth.sa",
    clientCompany: "Al-Noor Healthcare Group",
    projectName: "Health Records Cloud Sync",
    issueDate: "2026-03-15",
    dueDate: "2026-04-15",
    items: [
      {
        id: "inv-item-4",
        description: "Phase 1: Healthcare security compliance audit & credential rotation",
        quantity: 1,
        unitPrice: 290000,
        total: 290000,
      },
    ],
    subtotal: 290000,
    taxRate: 18,
    taxAmount: 52200,
    discount: 0,
    totalAmount: 342200,
    amountPaid: 0,
    currency: "INR",
    status: "pending",
    notes: "Payment processing scheduled for weekly vendor disbursement run.",
    bankDetails: DEFAULT_BANK_DETAILS,
    createdAt: "2026-03-15T11:00:00Z",
  },
];

const QUOTATIONS_STORAGE_KEY = "aleef_crm_quotations_v2";
const INVOICES_STORAGE_KEY = "aleef_crm_invoices_v2";

function getStoredQuotations(): Quotation[] {
  if (typeof window === "undefined") return SEED_QUOTATIONS;
  try {
    const data = localStorage.getItem(QUOTATIONS_STORAGE_KEY);
    return data ? JSON.parse(data) : SEED_QUOTATIONS;
  } catch {
    return SEED_QUOTATIONS;
  }
}

function saveStoredQuotations(items: Quotation[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUOTATIONS_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn("Failed to persist quotations to localStorage:", err);
  }
}

function getStoredInvoices(): Invoice[] {
  if (typeof window === "undefined") return SEED_INVOICES;
  try {
    const data = localStorage.getItem(INVOICES_STORAGE_KEY);
    return data ? JSON.parse(data) : SEED_INVOICES;
  } catch {
    return SEED_INVOICES;
  }
}

function saveStoredInvoices(items: Invoice[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn("Failed to persist invoices to localStorage:", err);
  }
}

// ─── Quotations API ──────────────────────────────────────────────────────────

export const quotationsApi = {
  async getAll(): Promise<Quotation[]> {
    return getStoredQuotations();
  },

  async getById(id: string): Promise<Quotation | null> {
    const list = getStoredQuotations();
    return list.find((q) => q.id === id) || null;
  },

  async create(data: Omit<Quotation, "id" | "createdAt">): Promise<Quotation> {
    const list = getStoredQuotations();
    const newQuotation: Quotation = {
      ...data,
      id: `qt-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newQuotation, ...list];
    saveStoredQuotations(updated);
    return newQuotation;
  },

  async updateStatus(id: string, status: QuotationStatus): Promise<Quotation> {
    const list = getStoredQuotations();
    const index = list.findIndex((q) => q.id === id);
    if (index === -1) throw new Error("Quotation not found");

    const updatedQuotation = { ...list[index], status };
    list[index] = updatedQuotation;
    saveStoredQuotations([...list]);
    return updatedQuotation;
  },

  async convertToInvoice(quotationId: string): Promise<Invoice> {
    const list = getStoredQuotations();
    const quotation = list.find((q) => q.id === quotationId);
    if (!quotation) throw new Error("Quotation not found");

    // Generate Invoice from Quotation
    const invoices = getStoredInvoices();
    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(invoices.length + 101).padStart(4, "0")}`,
      quotationId: quotation.id,
      quotationNumber: quotation.quotationNumber,
      clientId: quotation.clientId,
      clientName: quotation.clientName,
      clientEmail: quotation.clientEmail,
      clientCompany: quotation.clientCompany,
      projectName: `Contract: ${quotation.items[0]?.description.slice(0, 30) || "Services"}`,
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      items: quotation.items,
      subtotal: quotation.subtotal,
      taxRate: quotation.taxRate,
      taxAmount: quotation.taxAmount,
      discount: quotation.discount,
      totalAmount: quotation.totalAmount,
      amountPaid: 0,
      currency: quotation.currency,
      status: "pending",
      notes: quotation.notes || "Generated from accepted quotation.",
      bankDetails: DEFAULT_BANK_DETAILS,
      createdAt: new Date().toISOString(),
    };

    // Save invoice
    saveStoredInvoices([newInvoice, ...invoices]);

    // Update quotation status to accepted and mark converted
    quotation.status = "accepted";
    quotation.convertedToInvoiceId = newInvoice.id;
    saveStoredQuotations([...list]);

    return newInvoice;
  },

  async delete(id: string): Promise<void> {
    const list = getStoredQuotations();
    const filtered = list.filter((q) => q.id !== id);
    saveStoredQuotations(filtered);
  },
};

// ─── Invoices API ────────────────────────────────────────────────────────────

export const invoicesApi = {
  async getAll(): Promise<Invoice[]> {
    return getStoredInvoices();
  },

  async getById(id: string): Promise<Invoice | null> {
    const list = getStoredInvoices();
    return list.find((i) => i.id === id) || null;
  },

  async create(data: Omit<Invoice, "id" | "createdAt" | "amountPaid">): Promise<Invoice> {
    const list = getStoredInvoices();
    const newInvoice: Invoice = {
      ...data,
      id: `inv-${Date.now()}`,
      amountPaid: data.status === "paid" ? data.totalAmount : 0,
      bankDetails: data.bankDetails || DEFAULT_BANK_DETAILS,
      createdAt: new Date().toISOString(),
    };
    const updated = [newInvoice, ...list];
    saveStoredInvoices(updated);
    return newInvoice;
  },

  async markAsPaid(id: string, paymentMethod = "Bank Wire Transfer"): Promise<Invoice> {
    const list = getStoredInvoices();
    const index = list.findIndex((i) => i.id === id);
    if (index === -1) throw new Error("Invoice not found");

    const inv = list[index];
    const updated: Invoice = {
      ...inv,
      status: "paid",
      amountPaid: inv.totalAmount,
      paymentMethod,
      paidAt: new Date().toISOString(),
    };
    list[index] = updated;
    saveStoredInvoices([...list]);
    return updated;
  },

  async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    const list = getStoredInvoices();
    const index = list.findIndex((i) => i.id === id);
    if (index === -1) throw new Error("Invoice not found");

    const inv = list[index];
    const updated: Invoice = {
      ...inv,
      status,
      amountPaid: status === "paid" ? inv.totalAmount : inv.amountPaid,
    };
    list[index] = updated;
    saveStoredInvoices([...list]);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const list = getStoredInvoices();
    const filtered = list.filter((i) => i.id !== id);
    saveStoredInvoices(filtered);
  },
};
