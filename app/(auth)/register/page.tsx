"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    toast.success("Account created successfully! Welcome to Aleef CRM.");
    setTimeout(() => {
      router.push("/portal/dashboard");
    }, 400);
  };

  return (
    <div className="rounded-2xl border border-border bg-card/90 p-8 shadow-xl backdrop-blur text-card-foreground">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">Create an account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started with Aleef CRM today
        </p>
      </div>
      <form onSubmit={handleRegister} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="full-name" className="block text-sm font-medium text-foreground">
            Full name
          </label>
          <input
            id="full-name"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 min-h-[44px] text-sm text-foreground placeholder:text-muted-foreground focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/30"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="reg-email" className="block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="reg-email"
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
          <label htmlFor="reg-password" className="block text-sm font-medium text-foreground">
            Password
          </label>
          <input
            id="reg-password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 min-h-[44px] text-sm text-foreground placeholder:text-muted-foreground focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/30"
          />
        </div>
        <button
          type="submit"
          id="btn-register"
          disabled={loading}
          className="w-full min-h-[44px] flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white shadow-glow-teal transition-all hover:bg-teal-500 active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}{" "}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-teal-600 dark:text-teal-400 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
