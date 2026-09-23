/**
 * app/(client)/layout.tsx
 *
 * Route group layout for client section.
 * Passes children directly to allow sub-layouts (such as portal/layout.tsx)
 * to manage their own layout shells without double-nesting headers.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Client Portal | Aleef CRM", template: "%s | Client | Aleef CRM" },
  description: "Enterprise CRM & Project Management Client Portal",
};

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
