/**
 * components/layout/ClientShell.tsx
 *
 * Client shell for the Client Portal (/portal/*).
 * Manages responsive sidebar drawer state, current path highlighting,
 * active client context, and client profile switcher for testing/demo.
 */

"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { ClientSidebar } from "./ClientSidebar";
import { Topbar } from "./Topbar";
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
    <div className="flex items-center gap-2 mr-2">
      <label htmlFor="client-select" className="hidden xl:inline text-xs font-medium text-muted-foreground">
        Active Client:
      </label>
      <div className="relative inline-flex items-center">
        <select
          id="client-select"
          value={client.clientId}
          onChange={(e) => switchClient(e.target.value)}
          aria-label="Switch active client account"
          className="h-8 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
        >
          {availableClients.map((c) => (
            <option key={c.clientId} value={c.clientId} className="bg-popover text-foreground">
              🏢 {c.companyName} ({c.contactPerson})
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
