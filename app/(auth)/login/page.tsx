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
      normalizedEmail.includes("manager") ||
      normalizedEmail.includes("sara") ||
      normalizedEmail.includes("omar")
    ) {
      router.push("/manager/dashboard");
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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-white">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-400">
          Sign in to your Aleef CRM account
        </p>
      </div>

      {/* Demo Credentials Quick Switcher */}
      <div className="mb-6 rounded-xl border border-teal-500/30 bg-teal-950/40 p-3.5 text-xs">
        <p className="font-semibold text-teal-300 mb-2 flex items-center justify-between">
          <span>⚡ Demo Accounts (Click to log in):</span>
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() =>
              setDemoCredentials("admin@aleefcrm.com", "admin123", "/admin/dashboard")
            }
            className="flex flex-col items-center justify-center rounded-lg border border-teal-500/20 bg-teal-900/30 p-2 text-center text-teal-100 hover:bg-teal-700/50 hover:border-teal-400 transition-all focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <Shield className="h-4 w-4 text-teal-400 mb-1" />
            <span className="font-bold text-[11px]">Admin</span>
            <span className="text-[9px] text-teal-300/80">admin@aleefcrm.com</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setDemoCredentials(
                "sara.ahmed@aleefcrm.com",
                "manager123",
                "/manager/dashboard"
              )
            }
            className="flex flex-col items-center justify-center rounded-lg border border-sky-500/20 bg-sky-900/30 p-2 text-center text-sky-100 hover:bg-sky-700/50 hover:border-sky-400 transition-all focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <Briefcase className="h-4 w-4 text-sky-400 mb-1" />
            <span className="font-bold text-[11px]">Manager</span>
            <span className="text-[9px] text-sky-300/80">sara.ahmed@aleefcrm.com</span>
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
            className="flex flex-col items-center justify-center rounded-lg border border-amber-500/20 bg-amber-900/30 p-2 text-center text-amber-100 hover:bg-amber-700/50 hover:border-amber-400 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <Building2 className="h-4 w-4 text-amber-400 mb-1" />
            <span className="font-bold text-[11px]">Client</span>
            <span className="text-[9px] text-amber-300/80">farid@apexlogistics.sa</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-300"
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
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 min-h-[44px] text-sm text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-300"
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
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 min-h-[44px] text-sm text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
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

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-teal-400 hover:text-teal-300">
          Register
        </Link>
      </p>
    </div>
  );
}
