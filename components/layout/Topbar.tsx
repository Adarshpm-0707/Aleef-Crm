/**
 * Topbar — sticky top navigation bar.
 * - Hamburger button on mobile/tablet (triggers sidebar drawer via onMenuClick)
 * - Page title passed from parent
 * - Search, notifications, theme toggle, user avatar
 */

"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface TopbarProps {
  title?: string;
  onMenuClick?: () => void;
  /** User info for the avatar */
  user?: {
    name: string;
    email?: string;
    avatarUrl?: string;
    role?: string;
  };
  /** Optionally inject extra actions (right side) */
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
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <header
      role="banner"
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "sm:px-6",
        className,
      )}
    >
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3">
        {/* Hamburger (mobile) */}
        <button
          type="button"
          id="topbar-menu-btn"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          aria-controls="sidebar-navigation-drawer"
          className={cn(
            "inline-flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors",
            "hover:bg-muted hover:text-foreground lg:hidden",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {title && (
          <h2 className="hidden text-sm font-medium text-muted-foreground sm:block">
            {title}
          </h2>
        )}
      </div>

      {/* Right: actions + notifications + user */}
      <div className="flex items-center gap-1.5">
        {actions}

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            id="topbar-notifications-btn"
            aria-label="Notifications"
            aria-haspopup="true"
            aria-expanded={notifOpen}
            onClick={() => { setNotifOpen((v) => !v); setUserOpen(false); }}
            className={cn(
              "relative inline-flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors",
              "hover:bg-muted hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {/* Badge */}
            <span aria-label="3 unread notifications" className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-background" />
          </button>

          {notifOpen && (
            <div
              role="dialog"
              aria-label="Notifications panel"
              className="absolute right-0 z-50 mt-2 w-80 origin-top-right rounded-xl border border-border bg-popover shadow-lg animate-scale-in"
            >
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Notifications</p>
              </div>
              {[
                { text: "New lead assigned to you", time: "2 min ago", unread: true },
                { text: "Task 'Proposal Draft' is due today", time: "1 hr ago", unread: true },
                { text: "Client Farid approved the contract", time: "3 hrs ago", unread: false },
              ].map((n, i) => (
                <button
                  key={i}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:bg-muted",
                    n.unread && "bg-primary/5",
                  )}
                >
                  {n.unread && <span aria-hidden="true" className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}
                  <div className={cn("space-y-0.5", !n.unread && "pl-5")}>
                    <p className="font-medium text-foreground">{n.text}</p>
                    <p className="text-xs text-muted-foreground">{n.time}</p>
                  </div>
                </button>
              ))}
              <div className="border-t border-border px-4 py-2">
                <button className="text-xs font-medium text-primary hover:underline">Mark all as read</button>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            type="button"
            id="topbar-user-btn"
            aria-label={`User menu for ${user?.name ?? "User"}`}
            aria-haspopup="true"
            aria-expanded={userOpen}
            onClick={() => { setUserOpen((v) => !v); setNotifOpen(false); }}
            className={cn(
              "flex min-h-[44px] sm:min-h-0 items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 sm:py-1 text-sm font-medium transition-colors",
              "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-7 w-7 rounded-full object-cover ring-2 ring-primary/30" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-500/20 text-xs font-bold text-teal-600 ring-2 ring-teal-500/30">
                {initials}
              </span>
            )}
            <span className="hidden max-w-[100px] truncate sm:inline">{user?.name ?? "User"}</span>
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-muted-foreground">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>

          {userOpen && (
            <div
              role="menu"
              aria-label="User options"
              className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl border border-border bg-popover shadow-lg animate-scale-in py-1"
            >
              {/* Header */}
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{user?.name ?? "User"}</p>
                {user?.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
                {user?.role && (
                  <span className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                    {user.role}
                  </span>
                )}
              </div>

              {[
                { label: "Profile", icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" },
                { label: "Settings", icon: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
              ].map((item) => (
                <button
                  key={item.label}
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors focus-visible:bg-muted focus-visible:outline-none"
                >
                  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4 text-muted-foreground">
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {item.label}
                </button>
              ))}

              <div className="border-t border-border">
                <button
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors focus-visible:bg-danger/10 focus-visible:outline-none"
                >
                  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
