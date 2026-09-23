import * as React from "react";
import { cn } from "@/lib/utils";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading..."
      className={cn("animate-pulse rounded-md bg-muted/70", className)}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm" role="status" aria-busy="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-28" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5, columns }: { rows?: number; cols?: number; columns?: number }) {
  const colCount = columns || cols || 5;
  return (
    <div className="space-y-4" role="status" aria-busy="true">
      {/* Desktop Table Skeleton */}
      <div className="hidden rounded-xl border border-border bg-card p-4 md:block">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-9 w-64 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-4 border-b border-border pb-3">
            {Array.from({ length: colCount }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full rounded" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="grid grid-cols-5 gap-4 py-2">
              {Array.from({ length: cols }).map((_, c) => (
                <Skeleton key={c} className="h-5 w-full rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Stacked Card Skeleton */}
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-card">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-3/4" />
            <div className="pt-2 border-t border-border flex justify-between">
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-card" role="status" aria-busy="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="h-4 w-2/3" />
      <div className="space-y-2 pt-2 border-t border-border">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}
