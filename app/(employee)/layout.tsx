/**
 * app/(employee)/layout.tsx
 *
 * Full-screen Employee layout shell with responsive collapsible sidebar,
 * topbar, active employee switcher, and notifications.
 */

import type { Metadata } from "next";
import { EmployeeShell } from "@/components/layout/EmployeeShell";

export const metadata: Metadata = {
  title: { default: "Employee Portal | Aleef CRM", template: "%s | Employee | Aleef CRM" },
  description: "Enterprise CRM, Work Execution, and Time Tracking Employee Portal",
};

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <EmployeeShell>{children}</EmployeeShell>;
}
