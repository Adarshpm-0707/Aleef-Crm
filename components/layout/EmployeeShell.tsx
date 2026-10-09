/**
 * components/layout/EmployeeShell.tsx
 *
 * Modern minimalist Employee layout shell with responsive collapsible sidebar,
 * topbar, active employee profile switcher, mobile bottom nav, and notifications.
 */

"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { EmployeeSidebar } from "./EmployeeSidebar";
import { Topbar } from "./Topbar";
import { MobileBottomBar } from "./MobileBottomBar";
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
    <div className="flex items-center gap-1.5 mr-1 sm:mr-2">
      <div className="relative inline-flex items-center">
        <select
          id="emp-select"
          value={employee.userId}
          onChange={(e) => switchEmployee(e.target.value)}
          aria-label="Switch active employee"
          className="h-8 max-w-[130px] sm:max-w-[200px] rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer truncate"
        >
          {availableEmployees.map((e) => (
            <option key={e.userId} value={e.userId} className="bg-popover text-foreground">
              {e.fullName} ({e.departmentName})
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
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="mx-auto max-w-7xl animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation bar (< lg) */}
      <MobileBottomBar
        section="employee"
        onMenuClick={() => setMobileOpen(true)}
      />

      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
