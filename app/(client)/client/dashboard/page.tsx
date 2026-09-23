import { redirect } from "next/navigation";

export default function ClientLegacyDashboardPage() {
  redirect("/portal/dashboard");
}
