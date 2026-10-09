/**
 * components/layout/Topbar.tsx
 *
 * Modern minimalist sticky top navigation bar with:
 * - Responsive hamburger drawer trigger for mobile/tablet
 * - Clean page title
 * - Notification dropdown with live indicators
 * - User avatar menu and theme switcher
 */

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  Menu,
  Bell,
  CheckCircle2,
  Clock,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Settings,
  Sparkles,
} from "lucide-react";

export interface TopbarProps {
  title?: string;
  onMenuClick?: () => void;
  user?: {
    name: string;
    email?: string;
    avatarUrl?: string;
    role?: string;
  };
  actions?: React.ReactNode;
  className?: string;
}

export function Topbar({ title, onMenuClick, user, actions, className }: TopbarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  // Close dropdowns on Escape key
  useEffect(() => {
    if (!notifOpen && !userOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNotifOpen(false);
        setUserOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [notifOpen, userOpen]);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <header
      role="banner"
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/70 bg-background/85 px-3.5 sm:px-6 backdrop-blur-md supports-[backdrop-filter]:bg-background/75 transition-colors",
        className
      )}
    >
      {/* Left Column: Hamburger + Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger (Mobile & Tablet) */}
        <button
          type="button"
          id="topbar-menu-btn"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          aria-controls="sidebar-navigation-drawer"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Page Title */}
        {title && (
          <h2 className="text-sm sm:text-base font-semibold text-foreground tracking-tight truncate">
            {title}
          </h2>
        )}
      </div>

      {/* Right Column: Actions + Notifications + Theme Toggle + User Menu */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Custom Actions (e.g. Employee Switcher or Client Switcher) */}
        {actions && <div className="flex items-center">{actions}</div>}

        {/* Theme Toggle (Light / Dark) */}
        <ThemeToggle variant="pill" className="hidden sm:inline-flex" />
        <ThemeToggle variant="icon" className="sm:hidden" />

        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            id="topbar-notifications-btn"
            aria-label="Notifications"
            aria-haspopup="true"
            aria-expanded={notifOpen}
            onClick={() => {
              setNotifOpen((v) => !v);
              setUserOpen(false);
            }}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 text-muted-foreground transition-all hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Bell className="h-4 w-4" />
            {/* Live Indicator Pill */}
            <span
              aria-label="3 notifications"
              className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background"
            />
          </button>

          {notifOpen && (
            <div
              role="dialog"
              aria-label="Notifications panel"
              className="absolute right-0 top-full mt-2 w-80 sm:w-88 origin-top-right rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-xl shadow-2xl animate-scale-in z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-muted/20">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">Notifications</p>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    3 New
                  </span>
                </div>
                <button
                  onClick={() => setNotifOpen(false)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Mark read
                </button>
              </div>

              <div className="divide-y divide-border/40 max-h-80 overflow-y-auto">
                {[
                  {
                    title: "Proposal Approved",
                    desc: "Apex Logistics approved the Q3 scope proposal.",
                    time: "10m ago",
                    icon: CheckCircle2,
                    color: "text-emerald-500 bg-emerald-500/10",
                    unread: true,
                  },
                  {
                    title: "Task Review Due",
                    desc: "Deliverable 'Cloud Infrastructure Architecture' awaiting review.",
                    time: "1h ago",
                    icon: Clock,
                    color: "text-amber-500 bg-amber-500/10",
                    unread: true,
                  },
                  {
                    title: "System Update",
                    desc: "Aleef CRM v2.4 upgrade completed smoothly.",
                    time: "3h ago",
                    icon: Sparkles,
                    color: "text-teal-500 bg-teal-500/10",
                    unread: false,
                  },
                ].map((n, i) => {
                  const NIcon = n.icon;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-3 p-3.5 transition-colors hover:bg-muted/40 cursor-pointer",
                        n.unread && "bg-primary/[0.03]"
                      )}
                    >
                      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5", n.color)}>
                        <NIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-0.5 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-foreground truncate">{n.title}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0">{n.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {n.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border/60 p-2.5 text-center bg-muted/10">
                <Link
                  href="/admin/crm/follow-ups"
                  onClick={() => setNotifOpen(false)}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all activity history &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            type="button"
            id="topbar-user-btn"
            aria-label={`User menu for ${user?.name ?? "User"}`}
            aria-haspopup="true"
            aria-expanded={userOpen}
            onClick={() => {
              setUserOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="flex h-9 items-center gap-2 rounded-xl border border-border/70 px-2 py-1 text-sm font-medium transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-6 w-6 rounded-lg object-cover ring-1 ring-primary/30"
              />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-500/15 text-xs font-bold text-teal-600 dark:text-teal-400">
                {initials}
              </span>
            )}
            <span className="hidden max-w-[110px] truncate md:inline text-xs font-semibold text-foreground">
              {user?.name ?? "User"}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>

          {userOpen && (
            <div
              role="menu"
              aria-label="User options"
              className="absolute right-0 top-full mt-2 w-56 origin-top-right rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-xl shadow-2xl animate-scale-in py-1.5 z-50 overflow-hidden"
            >
              {/* User Details */}
              <div className="border-b border-border/60 px-4 py-3 bg-muted/20">
                <p className="text-sm font-semibold text-foreground truncate">{user?.name ?? "User"}</p>
                {user?.email && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                )}
                {user?.role && (
                  <span className="mt-2 inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {user.role}
                  </span>
                )}
              </div>

              {/* Account settings */}
              <div className="p-1 space-y-0.5">
                <Link
                  href="/admin/settings/company"
                  onClick={() => setUserOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Platform Settings</span>
                </Link>
                <Link
                  href="/portal/profile"
                  onClick={() => setUserOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>User Profile</span>
                </Link>
              </div>

              {/* Sign out */}
              <div className="border-t border-border/60 p-1">
                <Link
                  href="/login"
                  onClick={() => setUserOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign out</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
