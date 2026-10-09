/**
 * components/layout/MobileBottomBar.tsx
 *
 * Modern minimalist mobile bottom navigation bar.
 * Provides thumb-friendly navigation across key pages for mobile view (< lg),
 * with quick access to the main dashboard, primary features, and navigation drawer.
 */

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CalendarCheck,
  Briefcase,
  Calendar,
  UploadCloud,
  FileText,
  User,
  Menu,
} from "lucide-react";

interface MobileBottomBarProps {
  section: "admin" | "employee" | "client";
  onMenuClick: () => void;
}

export function MobileBottomBar({ section, onMenuClick }: MobileBottomBarProps) {
  const pathname = usePathname();

  const adminItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Clients", href: "/admin/crm/clients", icon: Users },
    { label: "Projects", href: "/admin/projects/kanban", icon: FolderKanban },
    { label: "Attendance", href: "/admin/attendance/today", icon: CalendarCheck },
  ];

  const employeeItems = [
    { label: "Dashboard", href: "/employee/dashboard", icon: LayoutDashboard },
    { label: "Work", href: "/employee/client-work", icon: Briefcase },
    { label: "Schedule", href: "/employee/schedule", icon: Calendar },
    { label: "Upload", href: "/employee/work-upload", icon: UploadCloud },
  ];

  const clientItems = [
    { label: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
    { label: "Projects", href: "/portal/projects", icon: FolderKanban },
    { label: "Invoices", href: "/portal/invoices", icon: FileText },
    { label: "Profile", href: "/portal/profile", icon: User },
  ];

  const items =
    section === "admin"
      ? adminItems
      : section === "employee"
      ? employeeItems
      : clientItems;

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border/80 bg-background/95 px-2 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 lg:hidden shadow-lg pb-[env(safe-area-inset-bottom,0px)]"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== "/portal/dashboard" && item.href !== "/admin/dashboard" && item.href !== "/employee/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center py-1 text-center transition-all duration-150 touch-target",
              isActive
                ? "text-primary font-semibold scale-105"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
              isActive && "bg-primary/10"
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
          </Link>
        );
      })}

      {/* Menu / All Nav Drawer Trigger */}
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open full menu"
        className="flex flex-1 flex-col items-center justify-center py-1 text-center text-muted-foreground hover:text-foreground transition-all duration-150 touch-target"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-muted transition-colors">
          <Menu className="h-4 w-4" />
        </div>
        <span className="text-[10px] tracking-tight mt-0.5">Menu</span>
      </button>
    </nav>
  );
}
