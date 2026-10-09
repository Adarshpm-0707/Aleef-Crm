"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  /**
   * "pill": Full toggle pill showing both Light & Dark buttons with active state
   * "icon": Compact single button toggler
   */
  variant?: "pill" | "icon";
  className?: string;
}

export function ThemeToggle({ variant = "pill", className }: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  if (variant === "icon") {
    return (
      <button
        type="button"
        id="theme-toggle-icon-btn"
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        title={isDark ? "Switch to light theme" : "Switch to dark theme"}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all duration-200",
          "hover:bg-muted hover:text-foreground active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
      >
        {!mounted ? (
          <span className="h-4 w-4" />
        ) : isDark ? (
          <Sun className="h-4 w-4 text-amber-500 transition-transform duration-300 hover:rotate-45" />
        ) : (
          <Moon className="h-4 w-4 text-teal-600 transition-transform duration-300 hover:-rotate-12" />
        )}
      </button>
    );
  }

  // "pill" variant
  return (
    <div
      role="group"
      aria-label="Theme mode switcher"
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-muted/60 p-0.5 shadow-sm transition-colors",
        className
      )}
    >
      <button
        type="button"
        id="theme-toggle-light-btn"
        onClick={() => setTheme("light")}
        aria-pressed={!isDark}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200",
          !isDark && mounted
            ? "bg-background text-teal-700 shadow-sm font-semibold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Sun className={cn("h-3.5 w-3.5", !isDark && mounted ? "text-amber-500" : "text-muted-foreground")} />
        <span>Light</span>
      </button>

      <button
        type="button"
        id="theme-toggle-dark-btn"
        onClick={() => setTheme("dark")}
        aria-pressed={isDark}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200",
          isDark && mounted
            ? "bg-slate-800 text-teal-300 shadow-sm font-semibold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Moon className={cn("h-3.5 w-3.5", isDark && mounted ? "text-teal-400" : "text-muted-foreground")} />
        <span>Dark</span>
      </button>
    </div>
  );
}
