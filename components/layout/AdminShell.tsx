/**
 * components/layout/AdminShell.tsx
 *
 * Client shell for the Admin section.
 * Manages responsive sidebar drawer state, current path highlighting,
 * and topbar controls.
 */

"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import { Topbar } from "./Topbar";
import { Toaster } from "sonner";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const user = {
    name: "Ahmed Al-Mansoor",
    email: "admin@aleefcrm.com",
    role: "Admin",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar (desktop and responsive mobile drawer) */}
      <AdminSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        activeHref={pathname}
      />

      {/* Main content column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          title="Aleef Admin Portal"
          onMenuClick={() => setMobileOpen(true)}
          user={user}
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
