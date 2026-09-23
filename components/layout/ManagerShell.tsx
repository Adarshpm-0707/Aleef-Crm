/**
 * components/layout/ManagerShell.tsx
 *
 * Client shell for the Manager section.
 * Manages responsive sidebar drawer state, current path highlighting,
 * active manager context, and manager profile switcher.
 */

"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { ManagerSidebar } from "./ManagerSidebar";
import { Topbar } from "./Topbar";
import { Toaster } from "sonner";
import { useCurrentManager } from "@/lib/permissions/manager";

export function ManagerShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { manager, availableManagers, switchManager } = useCurrentManager();

  const user = {
    name: manager.fullName,
    email: manager.email,
    role: `Manager (${manager.departmentName})`,
  };

  const managerSwitcherAction = (
    <div className="flex items-center gap-2 mr-2">
      <label htmlFor="mgr-select" className="hidden xl:inline text-xs font-medium text-muted-foreground">
        Active Scope:
      </label>
      <div className="relative inline-flex items-center">
        <select
          id="mgr-select"
          value={manager.userId}
          onChange={(e) => switchManager(e.target.value)}
          aria-label="Switch manager scope"
          className="h-8 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-500 transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
        >
          {availableManagers.map((m) => (
            <option key={m.userId} value={m.userId} className="bg-popover text-foreground">
              👤 {m.fullName} ({m.departmentName})
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar (desktop and responsive mobile drawer) */}
      <ManagerSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        activeHref={pathname}
      />

      {/* Main content column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          title="Aleef Manager Portal"
          onMenuClick={() => setMobileOpen(true)}
          user={user}
          actions={managerSwitcherAction}
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
