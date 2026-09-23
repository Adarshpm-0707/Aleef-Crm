/**
 * lib/permissions/client.ts
 *
 * Client Capability Map, Active Client Context, and Scoping Utilities.
 * Strictly enforces read-only access for client users, permitting only:
 *  - Viewing their own projects, deliverables, tasks, invoices, and notifications
 *  - Posting comments on their accessible tasks
 *  - Viewing and updating their own contact information
 *
 * Complete omission of admin and manager controls:
 *  - No task creation, editing, deleting, or reassignment
 *  - No project creation, editing, or deletion
 *  - No status drag-and-drop or status manipulation controls
 */

"use client";

import { useEffect, useState } from "react";
import type { Project, Task } from "@/lib/api";

/* ─── Client Capabilities ─────────────────────────────────────────────────── */

export interface ClientCapabilities {
  canViewAllClients: false;
  canEditClientDetails: false; // only own contact info allowed
  canEditOwnContactInfo: true;
  canDeleteClient: false;
  canCreateProjects: false;
  canEditProjects: false;
  canDeleteProjects: false;
  canCreateTasks: false;
  canEditTasks: false;
  canDeleteTasks: false;
  canReassignTasks: false;
  canChangeTaskStatus: false;
  canCommentOnTasks: true;
  canViewInvoices: true;
  canManageTeam: false;
  canViewAttendance: false;
}

export const CLIENT_CAPABILITIES: Readonly<ClientCapabilities> = Object.freeze({
  canViewAllClients: false,
  canEditClientDetails: false,
  canEditOwnContactInfo: true,
  canDeleteClient: false,
  canCreateProjects: false,
  canEditProjects: false,
  canDeleteProjects: false,
  canCreateTasks: false,
  canEditTasks: false,
  canDeleteTasks: false,
  canReassignTasks: false,
  canChangeTaskStatus: false,
  canCommentOnTasks: true,
  canViewInvoices: true,
  canManageTeam: false,
  canViewAttendance: false,
});

/* ─── Pre-Configured Client Accounts ───────────────────────────────────────── */

export interface ClientProfile {
  clientId: string;
  userId: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  industry: string;
  assignedManagerName: string;
  assignedManagerEmail: string;
  assignedManagerPhone?: string;
  status: string;
  totalRevenue: number;
}

export const AVAILABLE_CLIENTS: ClientProfile[] = [
  {
    clientId: "c-1",
    userId: "u-client-1",
    companyName: "Apex Global Logistics",
    contactPerson: "Farid Al-Zahrani",
    email: "farid@apexlogistics.sa",
    phone: "+966 54 111 2233",
    address: "King Fahd Road, Riyadh, Saudi Arabia",
    industry: "Supply Chain & Logistics",
    assignedManagerName: "Sara Ahmed",
    assignedManagerEmail: "sara.ahmed@aleefcrm.com",
    assignedManagerPhone: "+966 50 888 1234",
    status: "active",
    totalRevenue: 145000,
  },
  {
    clientId: "c-2",
    userId: "u-client-2",
    companyName: "Al-Noor Health Group",
    contactPerson: "Dr. Noura Mansour",
    email: "n.mansour@alnoorhealth.com",
    phone: "+966 55 222 3344",
    address: "Olaya Street, Riyadh, Saudi Arabia",
    industry: "Healthcare",
    assignedManagerName: "Omar Hassan",
    assignedManagerEmail: "omar.hassan@aleefcrm.com",
    assignedManagerPhone: "+966 55 777 5678",
    status: "active",
    totalRevenue: 98000,
  },
  {
    clientId: "c-3",
    userId: "u-client-3",
    companyName: "FinTech Oasis",
    contactPerson: "Kareem El-Sayed",
    email: "kareem@fintechoasis.io",
    phone: "+971 50 888 9900",
    address: "DIFC Gate Tower, Dubai, UAE",
    industry: "Financial Technology",
    assignedManagerName: "Sara Ahmed",
    assignedManagerEmail: "sara.ahmed@aleefcrm.com",
    assignedManagerPhone: "+966 50 888 1234",
    status: "active",
    totalRevenue: 65000,
  },
];

const ACTIVE_CLIENT_STORAGE_KEY = "aleef_crm_active_client_v1";

/* ─── Active Client Accessors ─────────────────────────────────────────────── */

export function getActiveClient(): ClientProfile {
  if (typeof window !== "undefined") {
    try {
      const savedId = localStorage.getItem(ACTIVE_CLIENT_STORAGE_KEY);
      if (savedId) {
        const found = AVAILABLE_CLIENTS.find((c) => c.clientId === savedId || c.userId === savedId);
        if (found) return found;
      }
    } catch {
      // ignore
    }
  }
  return AVAILABLE_CLIENTS[0];
}

export function setActiveClient(clientId: string): ClientProfile {
  const target = AVAILABLE_CLIENTS.find((c) => c.clientId === clientId || c.userId === clientId) || AVAILABLE_CLIENTS[0];
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(ACTIVE_CLIENT_STORAGE_KEY, target.clientId);
      window.dispatchEvent(new CustomEvent("client-changed", { detail: target }));
    } catch {
      // ignore
    }
  }
  return target;
}

/**
 * Hook to read and reactively switch active client account.
 */
export function useCurrentClient() {
  const [client, setClientState] = useState<ClientProfile>(AVAILABLE_CLIENTS[0]);

  useEffect(() => {
    setClientState(getActiveClient());

    const handleClientChange = (e: Event) => {
      const custom = e as CustomEvent<ClientProfile>;
      if (custom.detail) {
        setClientState(custom.detail);
      } else {
        setClientState(getActiveClient());
      }
    };

    window.addEventListener("client-changed", handleClientChange);
    return () => window.removeEventListener("client-changed", handleClientChange);
  }, []);

  const switchClient = (clientId: string) => {
    const updated = setActiveClient(clientId);
    setClientState(updated);
  };

  const updateContactInfo = (info: Partial<Pick<ClientProfile, "contactPerson" | "phone" | "email" | "address">>) => {
    setClientState((prev) => {
      const next = { ...prev, ...info };
      // update in AVAILABLE_CLIENTS in-memory reference as well
      const idx = AVAILABLE_CLIENTS.findIndex((c) => c.clientId === prev.clientId);
      if (idx >= 0) {
        AVAILABLE_CLIENTS[idx] = next;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("client-changed", { detail: next }));
      }
      return next;
    });
  };

  return {
    client,
    availableClients: AVAILABLE_CLIENTS,
    switchClient,
    updateContactInfo,
    capabilities: CLIENT_CAPABILITIES,
  };
}

/* ─── Client Scoping Utilities ─────────────────────────────────────────────── */

export function filterProjectsForClient(projects: Project[], clientId: string): Project[] {
  return projects.filter((p) => p.client_id === clientId);
}

export function filterTasksForClient(tasks: Task[], clientId: string, clientProjects?: Project[]): Task[] {
  const projectIds = new Set((clientProjects || []).map((p) => p.id));
  return tasks.filter((t) => {
    if (t.client_id === clientId) return true;
    if (t.project_id && projectIds.has(t.project_id)) return true;
    return false;
  });
}

export interface TaskStatusBreakdown {
  total: number;
  todo: number;
  in_progress: number;
  review: number;
  completed: number;
  todoPct: number;
  inProgressPct: number;
  reviewPct: number;
  completedPct: number;
}

export function calculateTaskBreakdown(tasks: Task[]): TaskStatusBreakdown {
  const total = tasks.length;
  const todo = tasks.filter((t) => t.status === "todo").length;
  const in_progress = tasks.filter((t) => t.status === "in_progress").length;
  const review = tasks.filter((t) => t.status === "review").length;
  const completed = tasks.filter((t) => t.status === "completed").length;

  return {
    total,
    todo,
    in_progress,
    review,
    completed,
    todoPct: total > 0 ? Math.round((todo / total) * 100) : 0,
    inProgressPct: total > 0 ? Math.round((in_progress / total) * 100) : 0,
    reviewPct: total > 0 ? Math.round((review / total) * 100) : 0,
    completedPct: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}
