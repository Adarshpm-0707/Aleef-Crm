/**
 * components/layout/EmployeeShell.tsx
 *
 * Full-screen Employee layout shell with responsive collapsible sidebar,
 * topbar, active employee switcher, and notifications.
 */

"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { EmployeeSidebar } from "./EmployeeSidebar";
import { Topbar } from "./Topbar";
import { Toaster } from "sonner";
import { useCurrentEmployee } from "@/lib/permissions/employee";

export function EmployeeShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { employee, availableEmployees, switchEmployee } = useCurrentEmployee();

  const user = {
    name: employee.fullName,
    email: employee.email,
    role: `Employee (${employee.departmentName})`,
  };

  const employeeSwitcherAction = (
    <div className="flex items-center gap-2 mr-2">
      <label htmlFor="emp-select" className="hidden xl:inline text-xs font-medium text-muted-foreground">
        Active Profile:
      </label>
      <div className="relative inline-flex items-center">
        <select
          id="emp-select"
          value={employee.userId}
          onChange={(e) => switchEmployee(e.target.value)}
          aria-label="Switch active employee"
          className="h-8 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          {availableEmployees.map((e) => (
            <option key={e.userId} value={e.userId} className="bg-popover text-foreground">
              👤 {e.fullName} ({e.departmentName})
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar (desktop and responsive mobile drawer) */}
      <EmployeeSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        activeHref={pathname}
      />

      {/* Main content column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          title="Aleef Employee Portal"
          onMenuClick={() => setMobileOpen(true)}
          user={user}
          actions={employeeSwitcherAction}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
