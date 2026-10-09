/**
 * Sidebar base — shared internals used by Admin/Manager/Client sidebars.
 * - Collapsible on desktop (icon-only mode)
 * - Drawer overlay on mobile/tablet
 * - Keyboard accessible, ARIA labelled
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/* ─── Types ────────────────────────────────────────────────────────────────── */

export interface NavItem {
  label: string;
  href: string;
  icon: string; // SVG path d=""
  badge?: string | number;
  /** Sub-items for nested navigation */
  children?: Omit<NavItem, "children">[];
}

export interface SidebarProps {
  /** Open state on mobile (controlled by parent / Topbar hamburger) */
  mobileOpen: boolean;
  onMobileClose: () => void;
  /** Color accent for role badge */
  accentColor: "teal" | "amber" | "sky" | "indigo";
  roleLabel: string;
  navItems: NavItem[];
  /** Current active href */
  activeHref?: string;
  bottomItems?: NavItem[];
  logo?: React.ReactNode;
  className?: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

const ACCENT = {
  teal:   { badge: "bg-teal-500/10 text-teal-700 dark:text-teal-400 dark:bg-teal-500/20",   glow: "shadow-glow-teal",  dot: "bg-teal-600 dark:bg-teal-500" },
  amber:  { badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 dark:bg-amber-500/20", glow: "shadow-glow-amber", dot: "bg-amber-600 dark:bg-amber-500" },
  sky:    { badge: "bg-sky-500/10 text-sky-700 dark:text-sky-400 dark:bg-sky-500/20",     glow: "shadow-glow-amber", dot: "bg-sky-600 dark:bg-sky-500" },
  indigo: { badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 dark:bg-indigo-500/20", glow: "shadow-glow-teal", dot: "bg-indigo-600 dark:bg-indigo-500" },
} as const;

function NavIcon({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
      className={cn("h-4 w-4 flex-shrink-0", className)}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (item.children?.length) {
    return (
      <li>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "flex min-h-[44px] sm:min-h-0 w-full items-center gap-3 rounded-xl px-3 py-2.5 sm:py-2 text-sm font-medium transition-all duration-150",
            "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            collapsed && "justify-center px-2",
          )}
          title={collapsed ? item.label : undefined}
        >
          <NavIcon d={item.icon} />
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-left">{item.label}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={cn("h-3.5 w-3.5 transition-transform duration-200", expanded && "rotate-180")}
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </>
          )}
        </button>
        {expanded && !collapsed && (
          <ul className="ml-5 mt-1 space-y-1 border-l border-sidebar-border/70 pl-3">
            {item.children.map((child) => (
              <li key={child.href}>
                <Link
                  href={child.href}
                  onClick={onClick}
                  className={cn(
                    "flex min-h-[40px] sm:min-h-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                    "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  )}
                >
                  <NavIcon d={child.icon} className="h-3.5 w-3.5" />
                  <span className="truncate">{child.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        title={collapsed ? item.label : undefined}
        className={cn(
          "flex min-h-[44px] sm:min-h-0 items-center gap-3 rounded-xl px-3 py-2.5 sm:py-2 text-sm font-medium transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          active
            ? "bg-primary/10 text-primary font-semibold shadow-xs border border-primary/20"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
          collapsed && "justify-center px-2",
        )}
      >
        <NavIcon d={item.icon} className={active ? "text-primary" : "text-muted-foreground"} />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge !== undefined && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    </li>
  );
}

/* ─── Main Sidebar Component ────────────────────────────────────────────────── */

export function SidebarBase({
  mobileOpen,
  onMobileClose,
  accentColor,
  roleLabel,
  navItems,
  activeHref,
  bottomItems = [],
  logo,
  className,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const accent = ACCENT[accentColor];

  /* trap focus when mobile drawer open */
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onMobileClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [mobileOpen, onMobileClose]);

  const SidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo / Brand */}
      <div
        className={cn(
          "flex h-16 flex-shrink-0 items-center gap-2.5 border-b border-sidebar-border",
          collapsed ? "justify-center px-3" : "px-5",
        )}
      >
        {logo ?? (
          <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white", accent.dot, accent.glow)}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        {!collapsed && (
          <>
            <span className="font-semibold tracking-tight text-sidebar-foreground">Aleef CRM</span>
            <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide", accent.badge)}>
              {roleLabel}
            </span>
          </>
        )}
      </div>

      {/* Nav */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto p-3">
        <ul role="list" className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={activeHref === item.href}
              collapsed={collapsed}
              onClick={onMobileClose}
            />
          ))}
        </ul>
      </nav>

      {/* Bottom items */}
      {bottomItems.length > 0 && (
        <div className="border-t border-sidebar-border p-3">
          <ul role="list" className="space-y-0.5">
            {bottomItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={activeHref === item.href}
                collapsed={collapsed}
                onClick={onMobileClose}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Theme toggle in sidebar */}
      <div className={cn("border-t border-sidebar-border p-3 flex items-center", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && <span className="text-xs font-medium text-sidebar-foreground/70">Appearance</span>}
        <ThemeToggle variant={collapsed ? "icon" : "pill"} />
      </div>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden border-t border-sidebar-border p-3 lg:block">
        <button
          type="button"
          id="sidebar-collapse-btn"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors",
            "hover:bg-sidebar-accent hover:text-sidebar-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            collapsed && "justify-center",
          )}
        >
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.75}
            stroke="currentColor"
            className={cn("h-4 w-4 flex-shrink-0 transition-transform", collapsed && "rotate-180")}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 9l-3 3m0 0l3 3m-3-3h7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        ref={sidebarRef}
        aria-label="Sidebar navigation"
        className={cn(
          "hidden h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 lg:flex",
          collapsed ? "w-16" : "w-64",
          className,
        )}
      >
        {SidebarContent}
      </aside>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            aria-hidden="true"
            onClick={onMobileClose}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden animate-fade-in"
          />
          {/* Panel */}
          <aside
            id="sidebar-navigation-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className={cn(
              "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar shadow-xl lg:hidden",
              "animate-slide-in-right",
            )}
          >
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Close menu"
              className="absolute right-3 top-3 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {SidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
