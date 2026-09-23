/**
 * app/(admin)/layout.tsx
 *
 * Full-screen admin layout shell with responsive collapsible sidebar,
 * topbar, and notifications.
 */

import type { Metadata } from "next";
import { AdminShell } from "@/components/layout/AdminShell";

export const metadata: Metadata = {
  title: { default: "Admin Portal | Aleef CRM", template: "%s | Admin | Aleef CRM" },
  description: "Enterprise CRM, HR, and Project Management Admin Portal",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
