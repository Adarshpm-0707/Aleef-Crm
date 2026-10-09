"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Shield, Briefcase, Building2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    toast.success("Signed in successfully!");

    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail.includes("admin")) {
      router.push("/admin/dashboard");
    } else if (
      normalizedEmail.includes("employee") ||
      normalizedEmail.includes("layla") ||
      normalizedEmail.includes("tariq")
    ) {
      router.push("/employee/dashboard");
    } else {
      router.push("/portal/dashboard");
    }
  };

  const setDemoCredentials = (
    demoEmail: string,
    demoPass: string,
    redirectUrl: string
  ) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    toast.success(`Loaded credentials for ${demoEmail}`);
    setTimeout(() => {
      router.push(redirectUrl);
    }, 400);
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-card/95 p-6 sm:p-8 shadow-xl backdrop-blur-md text-card-foreground">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Sign in to your Aleef Enterprise account
        </p>
      </div>

      {/* Demo Credentials Quick Switcher */}
      <div className="mb-6 rounded-2xl border border-border/80 bg-muted/20 p-3.5 text-xs">
        <p className="font-semibold text-foreground mb-2 flex items-center justify-between">
          <span>⚡ Quick 1-Click Access:</span>
          <span className="text-[10px] text-muted-foreground">Select role</span>
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() =>
              setDemoCredentials("admin@aleefcrm.com", "admin123", "/admin/dashboard")
            }
            className="flex flex-col items-center justify-center rounded-xl border border-teal-500/30 bg-background/80 p-2.5 text-center text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 hover:border-teal-400 transition-all focus:outline-none focus:ring-2 focus:ring-teal-400 shadow-xs active:scale-95"
          >
            <Shield className="h-4 w-4 text-teal-600 dark:text-teal-400 mb-1" />
            <span className="font-bold text-[11px]">Admin Portal</span>
            <span className="text-[9px] text-muted-foreground truncate max-w-full">admin@aleefcrm.com</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setDemoCredentials(
                "layla.khalid@aleefcrm.com",
                "employee123",
                "/employee/dashboard"
              )
            }
            className="flex flex-col items-center justify-center rounded-xl border border-indigo-500/30 bg-background/80 p-2.5 text-center text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 hover:border-indigo-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-xs active:scale-95"
          >
            <Briefcase className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mb-1" />
            <span className="font-bold text-[11px]">Employee Portal</span>
            <span className="text-[9px] text-muted-foreground truncate max-w-full">layla.khalid@aleefcrm.com</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setDemoCredentials(
                "farid@apexlogistics.sa",
                "client123",
                "/portal/dashboard"
              )
            }
            className="flex flex-col items-center justify-center rounded-xl border border-sky-500/30 bg-background/80 p-2.5 text-center text-sky-700 dark:text-sky-300 hover:bg-sky-500/10 hover:border-sky-400 transition-all focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-xs active:scale-95"
          >
            <Building2 className="h-4 w-4 text-sky-600 dark:text-sky-400 mb-1" />
            <span className="font-bold text-[11px]">Client Portal</span>
            <span className="text-[9px] text-muted-foreground truncate max-w-full">farid@apexlogistics.sa</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 min-h-[44px] text-sm text-foreground placeholder:text-muted-foreground focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/30"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-foreground"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 min-h-[44px] text-sm text-foreground placeholder:text-muted-foreground focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/30"
          />
        </div>
        <button
          type="submit"
          id="btn-sign-in"
          disabled={loading}
          className="w-full min-h-[44px] flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white shadow-glow-teal transition-all hover:bg-teal-500 active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"} <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-teal-600 dark:text-teal-400 font-medium hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
