/**
 * (auth) layout
 *
 * Centered, full-height auth shell with a gradient background.
 * No sidebar, no navigation — purely for login / register flows.
 */

import type { Metadata } from "next";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const metadata: Metadata = {
  title: {
    default: "Sign In",
    template: "%s | Aleef CRM",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 text-foreground">
      {/* Top right theme toggle button */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle variant="pill" />
      </div>
      {/* Ambient gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-teal-500/15 dark:bg-teal-600/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-amber-500/10 dark:bg-amber-500/15 blur-[100px]"
      />

      {/* Logo mark */}
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white shadow-glow-teal">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
          </svg>
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Aleef CRM
        </span>
      </div>

      {/* Page content */}
      <div className="relative z-10 w-full max-w-md px-4">{children}</div>

      <p className="mt-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Aleef CRM. All rights reserved.
      </p>
    </div>
  );
}
