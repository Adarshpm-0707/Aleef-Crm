/**
 * EmptyState — shown when a list/table/board has no data.
 * Fully accessible with ARIA, supports optional action button.
 */

import React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  /** Icon node (e.g. a Lucide icon). Falls back to generic box. */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Optional action rendered below the description */
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-label={title}
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center",
        className,
      )}
    >
      {/* Icon wrapper */}
      <div
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        {icon ?? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-7 w-7"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
        )}
      </div>

      {/* Text */}
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">{title}</p>
        {description && (
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Optional action */}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
