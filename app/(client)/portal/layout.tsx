/**
 * app/(client)/portal/layout.tsx
 *
 * Client Portal Shell Layout.
 * Wraps client portal pages with responsive sidebar, topbar with client switcher,
 * toast notifications, and main content area.
 */

import type { Metadata } from "next";
import { ClientShell } from "@/components/layout/ClientShell";

export const metadata: Metadata = {
  title: { default: "Client Portal | Aleef CRM", template: "%s | Client | Aleef CRM" },
  description: "Aleef CRM Client Portal - Real-time project tracking, deliverables, and communication",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientShell>{children}</ClientShell>;
}
