/**
 * components/layout/ClientShell.tsx
 *
 * Modern minimalist client shell for the Client Portal (/portal/*).
 * Manages responsive sidebar drawer state, current path highlighting,
 * active client account switcher, thumb-friendly mobile bottom bar, and notifications.
 */

"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { ClientSidebar } from "./ClientSidebar";
import { Topbar } from "./Topbar";
import { MobileBottomBar } from "./MobileBottomBar";
import { Toaster } from "sonner";
import { useCurrentClient } from "@/lib/permissions/client";

export function ClientShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { client, availableClients, switchClient } = useCurrentClient();

  const user = {
    name: client.contactPerson,
    email: client.email,
    role: `Client (${client.companyName})`,
  };

  const clientSwitcherAction = (
    <div className="flex items-center gap-1.5 mr-1 sm:mr-2">
      <div className="relative inline-flex items-center">
        <select
          id="client-select"
          value={client.clientId}
          onChange={(e) => switchClient(e.target.value)}
          aria-label="Switch active client account"
          className="h-8 max-w-[130px] sm:max-w-[200px] rounded-xl border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300 transition-colors focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer truncate"
        >
          {availableClients.map((c) => (
            <option key={c.clientId} value={c.clientId} className="bg-popover text-foreground">
              {c.companyName} ({c.contactPerson})
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar (desktop and responsive mobile drawer) */}
      <ClientSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        activeHref={pathname}
      />

      {/* Main content column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          title="Aleef Client Portal"
          onMenuClick={() => setMobileOpen(true)}
          user={user}
          actions={clientSwitcherAction}
        />
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="mx-auto max-w-7xl animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation bar (< lg) */}
      <MobileBottomBar
        section="client"
        onMenuClick={() => setMobileOpen(true)}
      />

      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
