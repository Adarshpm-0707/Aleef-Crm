/**
 * lib/permissions/manager.ts
 *
 * Manager Capability Map and Scope Enforcement Layer.
 * Defines strict RBAC and ABAC rules for the Manager role:
 *  - Scoped to manager's assigned clients (no access to other managers' clients)
 *  - Scoped to manager's team employees (direct reports and department members)
 *  - No user-role management (forbidden)
 *  - No deletion on core records (clients, employees, departments)
 *  - Full task orchestration (create, assign to team, update, review, comment)
 *  - Team attendance & leave approval permissions
 */

"use client";

import { useEffect, useState } from "react";
import type { Client, Employee, Task, Attendance, LeaveRequest } from "@/lib/api";

/* ─── Types & Capabilities ─────────────────────────────────────────────────── */

export interface ManagerCapabilities {
  canViewAllClients: false;
  canEditAssignedClients: true;
  canDeleteClients: false;
  canManageUserRoles: false;
  canDeleteEmployees: false;
  canCreateTasksForTeam: true;
  canEditTeamTasks: true;
  canDeleteTasks: false;
  canViewTeamAttendance: true;
  canApproveLeaves: true;
  canViewDepartmentReports: true;
}

export const MANAGER_CAPABILITIES: Readonly<ManagerCapabilities> = Object.freeze({
  canViewAllClients: false,
  canEditAssignedClients: true,
  canDeleteClients: false,
  canManageUserRoles: false,
  canDeleteEmployees: false,
  canCreateTasksForTeam: true,
  canEditTeamTasks: true,
  canDeleteTasks: false,
  canViewTeamAttendance: true,
  canApproveLeaves: true,
  canViewDepartmentReports: true,
});

export interface ManagerProfile {
  userId: string;
  employeeId: string;
  fullName: string;
  email: string;
  designation: string;
  departmentId: string;
  departmentName: string;
  avatarUrl?: string;
}

/* ─── Pre-configured Active Managers ───────────────────────────────────────── */

export const AVAILABLE_MANAGERS: ManagerProfile[] = [
  {
    userId: "u-mgr-1",
    employeeId: "emp-2",
    fullName: "Sara Ahmed",
    email: "sara.ahmed@aleefcrm.com",
    designation: "Sales Director",
    departmentId: "dept-2",
    departmentName: "Sales & Marketing",
  },
  {
    userId: "u-mgr-2",
    employeeId: "emp-3",
    fullName: "Omar Hassan",
    email: "omar.hassan@aleefcrm.com",
    designation: "Lead Systems Architect",
    departmentId: "dept-1",
    departmentName: "Engineering",
  },
];

const ACTIVE_MGR_STORAGE_KEY = "aleef_crm_active_manager_v1";

/* ─── Active Manager State Accessors ───────────────────────────────────────── */

export function getActiveManager(): ManagerProfile {
  if (typeof window !== "undefined") {
    try {
      const savedId = localStorage.getItem(ACTIVE_MGR_STORAGE_KEY);
      if (savedId) {
        const found = AVAILABLE_MANAGERS.find((m) => m.userId === savedId);
        if (found) return found;
      }
    } catch {
      // fallback to default
    }
  }
  return AVAILABLE_MANAGERS[0];
}

export function setActiveManager(userId: string): ManagerProfile {
  const target = AVAILABLE_MANAGERS.find((m) => m.userId === userId) || AVAILABLE_MANAGERS[0];
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(ACTIVE_MGR_STORAGE_KEY, target.userId);
      window.dispatchEvent(new CustomEvent("manager-changed", { detail: target }));
    } catch {
      // ignore
    }
  }
  return target;
}

/**
 * React Hook to access current active manager and reactivity to changes.
 */
export function useCurrentManager() {
  const [manager, setManagerState] = useState<ManagerProfile>(AVAILABLE_MANAGERS[0]);

  useEffect(() => {
    setManagerState(getActiveManager());

    const handleManagerChange = (e: Event) => {
      const custom = e as CustomEvent<ManagerProfile>;
      if (custom.detail) {
        setManagerState(custom.detail);
      } else {
        setManagerState(getActiveManager());
      }
    };

    window.addEventListener("manager-changed", handleManagerChange);
    return () => window.removeEventListener("manager-changed", handleManagerChange);
  }, []);

  const switchManager = (userId: string) => {
    const updated = setActiveManager(userId);
    setManagerState(updated);
  };

  return {
    manager,
    availableManagers: AVAILABLE_MANAGERS,
    switchManager,
    capabilities: MANAGER_CAPABILITIES,
  };
}

/* ─── Scope Filtering Utilities ────────────────────────────────────────────── */

/**
 * Filter clients to only those assigned to the specified manager.
 */
export function filterClientsForManager(clients: Client[], managerUserId: string): Client[] {
  return clients.filter((c) => c.assigned_manager_id === managerUserId);
}

/**
 * Check if a client is accessible by the specified manager.
 */
export function isClientAccessible(client: Client | null | undefined, managerUserId: string): boolean {
  if (!client) return false;
  return client.assigned_manager_id === managerUserId;
}

/**
 * Filter employees to direct reports or department team members under this manager.
 */
export function filterEmployeesForManager(
  employees: Employee[],
  manager: ManagerProfile
): Employee[] {
  return employees.filter(
    (e) =>
      e.user_id !== manager.userId && // exclude manager's own record from direct team listing
      (e.reporting_manager_id === manager.employeeId || e.department_id === manager.departmentId)
  );
}

/**
 * Check if an employee belongs to the manager's team.
 */
export function isEmployeeInManagerTeam(
  employee: Employee | null | undefined,
  manager: ManagerProfile
): boolean {
  if (!employee) return false;
  return (
    employee.reporting_manager_id === manager.employeeId ||
    employee.department_id === manager.departmentId
  );
}

/**
 * Filter tasks to those associated with the manager's clients, manager's team, or created by manager.
 */
export function filterTasksForManager(
  tasks: Task[],
  managerUserId: string,
  managerClientIds: string[],
  teamUserIds: string[]
): Task[] {
  const clientSet = new Set(managerClientIds);
  const teamSet = new Set(teamUserIds);

  return tasks.filter((t) => {
    // Created by manager
    if (t.created_by === managerUserId) return true;
    // Assigned to manager
    if (t.assignee_id === managerUserId) return true;
    // Belongs to manager's assigned client
    if (t.client_id && clientSet.has(t.client_id)) return true;
    // Assigned to team member
    if (t.assignee_id && teamSet.has(t.assignee_id)) return true;
    return false;
  });
}

/**
 * Filter attendance records to those belonging to manager's team.
 */
export function filterAttendanceForManager(
  attendanceList: Attendance[],
  teamEmployeeIds: string[]
): Attendance[] {
  const teamSet = new Set(teamEmployeeIds);
  return attendanceList.filter((a) => teamSet.has(a.employee_id));
}

/**
 * Filter leave requests to those belonging to manager's team.
 */
export function filterLeaveRequestsForManager(
  leaveRequests: LeaveRequest[],
  teamEmployeeIds: string[]
): LeaveRequest[] {
  const teamSet = new Set(teamEmployeeIds);
  return leaveRequests.filter((lr) => teamSet.has(lr.employee_id));
}

/* ─── Security Assertions ──────────────────────────────────────────────────── */

export class PermissionDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionDeniedError";
  }
}

/**
 * Assert that the manager has edit permissions for a client.
 */
export function assertCanEditClient(client: Client, managerUserId: string): void {
  if (client.assigned_manager_id !== managerUserId) {
    throw new PermissionDeniedError(
      `Access Denied: Client "${client.company_name}" is assigned to another manager. You can only modify your assigned clients.`
    );
  }
}

/**
 * Assert that deletion of core records is prohibited for managers.
 */
export function assertCanDeleteCoreRecord(entityType: "client" | "employee" | "department"): void {
  throw new PermissionDeniedError(
    `Action Prohibited: Managers do not have permission to delete ${entityType} records. Contact an Administrator.`
  );
}

/**
 * Assert that user-role management is restricted to administrators.
 */
export function assertCanManageUserRoles(): void {
  throw new PermissionDeniedError(
    "Action Prohibited: User role and credential management is restricted to Administrators."
  );
}
