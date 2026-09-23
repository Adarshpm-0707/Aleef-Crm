import { redirect } from "next/navigation";

/**
 * Root page — redirects to the login screen.
 * After authentication, middleware routes users to their role-specific portal.
 */
export default function RootPage() {
  redirect("/login");
}
