/**
 * app/(manager)/layout.tsx
 *
 * Full-screen Manager layout shell with responsive collapsible sidebar,
 * topbar, active manager switcher, and notifications.
 */

import type { Metadata } from "next";
import { ManagerShell } from "@/components/layout/ManagerShell";

export const metadata: Metadata = {
  title: { default: "Manager Portal | Aleef CRM", template: "%s | Manager | Aleef CRM" },
  description: "Enterprise CRM, HR, and Project Management Manager Portal",
};

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ManagerShell>{children}</ManagerShell>;
}
