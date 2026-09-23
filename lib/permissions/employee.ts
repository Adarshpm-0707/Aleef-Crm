/**
 * lib/permissions/employee.ts
 *
 * Employee Capability Map and Active Context Layer.
 * Defines RBAC rules and scopes for the Employee role:
 *  - Scoped to tasks, projects, deliverables assigned to this employee
 *  - Personal attendance tracking (punch in/out, view daily logs)
 *  - Personal leave applications and balance tracking
 *  - Deliverables upload and status tracking
 *  - Personal schedule management and calendar view
 *  - Personal performance and time reports
 */

"use client";

import { useEffect, useState } from "react";
import type { Task, Attendance, LeaveRequest, WorkDeliverable, WorkScheduleItem } from "@/lib/api";

/* ─── Types & Capabilities ─────────────────────────────────────────────────── */

export interface EmployeeCapabilities {
  canViewAssignedTasks: true;
  canUpdateTaskStatus: true;
  canUploadDeliverables: true;
  canPunchAttendance: true;
  canApplyLeave: true;
  canViewPersonalReports: true;
  canManagePersonalSchedule: true;
  canDeleteCoreRecords: false;
  canManageUserRoles: false;
}

export const EMPLOYEE_CAPABILITIES: Readonly<EmployeeCapabilities> = Object.freeze({
  canViewAssignedTasks: true,
  canUpdateTaskStatus: true,
  canUploadDeliverables: true,
  canPunchAttendance: true,
  canApplyLeave: true,
  canViewPersonalReports: true,
  canManagePersonalSchedule: true,
  canDeleteCoreRecords: false,
  canManageUserRoles: false,
});

export interface EmployeeProfile {
  userId: string;
  employeeId: string;
  fullName: string;
  email: string;
  designation: string;
  departmentId: string;
  departmentName: string;
  avatarUrl?: string;
  skills?: string[];
}

/* ─── Pre-configured Switchable Active Employees ───────────────────────────── */

export const AVAILABLE_EMPLOYEES: EmployeeProfile[] = [
  {
    userId: "u-emp-1",
    employeeId: "emp-4",
    fullName: "Layla Khalid",
    email: "layla.khalid@aleefcrm.com",
    designation: "Customer Success Specialist",
    departmentId: "dept-3",
    departmentName: "Client Success",
    skills: ["Client Relations", "SLA Monitoring", "Onboarding", "Technical Support"],
  },
  {
    userId: "u-emp-2",
    employeeId: "emp-5",
    fullName: "Tariq Aziz",
    email: "tariq.aziz@aleefcrm.com",
    designation: "Senior Full Stack Engineer",
    departmentId: "dept-1",
    departmentName: "Engineering",
    skills: ["Next.js", "TypeScript", "Kafka Streams", "PostgreSQL", "API Security"],
  },
];

const ACTIVE_EMP_STORAGE_KEY = "aleef_crm_active_employee_v1";

/* ─── Active Employee State Accessors ───────────────────────────────────────── */

export function getActiveEmployee(): EmployeeProfile {
  if (typeof window !== "undefined") {
    try {
      const savedId = localStorage.getItem(ACTIVE_EMP_STORAGE_KEY);
      if (savedId) {
        const found = AVAILABLE_EMPLOYEES.find((e) => e.userId === savedId);
        if (found) return found;
      }
    } catch {
      // fallback
    }
  }
  return AVAILABLE_EMPLOYEES[0];
}

export function setActiveEmployee(userId: string): EmployeeProfile {
  const target = AVAILABLE_EMPLOYEES.find((e) => e.userId === userId) || AVAILABLE_EMPLOYEES[0];
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(ACTIVE_EMP_STORAGE_KEY, target.userId);
      window.dispatchEvent(new CustomEvent("employee-changed", { detail: target }));
    } catch {
      // ignore
    }
  }
  return target;
}

/**
 * React Hook to access current active employee and reactivity to changes.
 */
export function useCurrentEmployee() {
  const [employee, setEmployeeState] = useState<EmployeeProfile>(AVAILABLE_EMPLOYEES[0]);

  useEffect(() => {
    setEmployeeState(getActiveEmployee());

    const handleEmployeeChange = (e: Event) => {
      const custom = e as CustomEvent<EmployeeProfile>;
      if (custom.detail) {
        setEmployeeState(custom.detail);
      } else {
        setEmployeeState(getActiveEmployee());
      }
    };

    window.addEventListener("employee-changed", handleEmployeeChange);
    return () => window.removeEventListener("employee-changed", handleEmployeeChange);
  }, []);

  const switchEmployee = (userId: string) => {
    const updated = setActiveEmployee(userId);
    setEmployeeState(updated);
  };

  return {
    employee,
    availableEmployees: AVAILABLE_EMPLOYEES,
    switchEmployee,
    capabilities: EMPLOYEE_CAPABILITIES,
  };
}

/* ─── Employee Scope Filtering Utilities ───────────────────────────────────── */

/**
 * Filter tasks to those assigned to the current employee.
 */
export function filterTasksForEmployee(tasks: Task[], employeeUserId: string): Task[] {
  return tasks.filter((t) => t.assignee_id === employeeUserId);
}

/**
 * Filter attendance records to those belonging to the current employee.
 */
export function filterAttendanceForEmployee(
  attendanceList: Attendance[],
  employeeId: string
): Attendance[] {
  return attendanceList.filter((a) => a.employee_id === employeeId);
}

/**
 * Filter leave requests to those belonging to the current employee.
 */
export function filterLeaveRequestsForEmployee(
  leaveRequests: LeaveRequest[],
  employeeId: string
): LeaveRequest[] {
  return leaveRequests.filter((lr) => lr.employee_id === employeeId);
}

/**
 * Filter deliverables to those uploaded by the current employee.
 */
export function filterDeliverablesForEmployee(
  deliverables: WorkDeliverable[],
  employeeUserId: string
): WorkDeliverable[] {
  return deliverables.filter((d) => d.uploaded_by === employeeUserId);
}

/**
 * Filter schedule items to those for the current employee.
 */
export function filterSchedulesForEmployee(
  schedules: WorkScheduleItem[],
  employeeId: string,
  employeeUserId: string
): WorkScheduleItem[] {
  return schedules.filter((s) => s.employee_id === employeeId || s.user_id === employeeUserId);
}
