/**
 * FilterBar — status / date-range / assignee / department filter strip.
 * Responsive: wraps to multiple rows on mobile, single row on md+.
 * Permission-aware: hides assignee filter for "client" role.
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";

/* ─── Types ────────────────────────────────────────────────────────────────── */

export type UserRole = "admin" | "manager" | "employee" | "client";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterBarFilters {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  assignee?: string;
  department?: string;
}

export interface FilterBarProps {
  filters: FilterBarFilters;
  onChange: (filters: FilterBarFilters) => void;
  statusOptions?: FilterOption[];
  assigneeOptions?: FilterOption[];
  departmentOptions?: FilterOption[];
  role?: UserRole;
  className?: string;
}

/* ─── Sub-components ───────────────────────────────────────────────────────── */

function SelectFilter({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string | undefined;
  options: FilterOption[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={cn(
          "min-h-[44px] sm:min-h-9 h-11 sm:h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "min-w-[120px] cursor-pointer",
        )}
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function DateInput({
  id,
  label,
  value,
  max,
  min,
  onChange,
}: {
  id: string;
  label: string;
  value: string | undefined;
  max?: string;
  min?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value ?? ""}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "min-h-[44px] sm:min-h-9 h-11 sm:h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "cursor-pointer",
        )}
      />
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────────────── */

const DEFAULT_STATUSES: FilterOption[] = [
  { value: "active",   label: "Active"   },
  { value: "inactive", label: "Inactive" },
  { value: "pending",  label: "Pending"  },
  { value: "closed",   label: "Closed"   },
];

export function FilterBar({
  filters,
  onChange,
  statusOptions = DEFAULT_STATUSES,
  assigneeOptions = [],
  departmentOptions = [],
  role = "admin",
  className,
}: FilterBarProps) {
  const update = (patch: Partial<FilterBarFilters>) =>
    onChange({ ...filters, ...patch });

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div
      role="search"
      aria-label="Filter controls"
      className={cn(
        "flex flex-wrap items-end gap-3 rounded-2xl border border-border/70 bg-card/95 p-4 shadow-xs",
        className,
      )}
    >
      {/* Search */}
      <div className="flex min-w-[180px] flex-1 flex-col gap-1">
        <label htmlFor="filter-search" className="sr-only">
          Search
        </label>
        <div className="relative">
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            id="filter-search"
            type="search"
            placeholder="Search…"
            value={filters.search ?? ""}
            onChange={(e) => update({ search: e.target.value })}
            className={cn(
              "min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground shadow-sm",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          />
        </div>
      </div>

      {/* Status */}
      {statusOptions.length > 0 && (
        <SelectFilter
          id="filter-status"
          label="Status"
          value={filters.status}
          options={statusOptions}
          onChange={(v) => update({ status: v })}
        />
      )}

      {/* Department */}
      {departmentOptions.length > 0 && (
        <SelectFilter
          id="filter-department"
          label="Department"
          value={filters.department}
          options={departmentOptions}
          onChange={(v) => update({ department: v })}
        />
      )}

      {/* Assignee — hidden for client role */}
      {role !== "client" && assigneeOptions.length > 0 && (
        <SelectFilter
          id="filter-assignee"
          label="Assignee"
          value={filters.assignee}
          options={assigneeOptions}
          onChange={(v) => update({ assignee: v })}
        />
      )}

      {/* Date range */}
      <div className="flex flex-wrap items-end gap-2">
        <DateInput
          id="filter-date-from"
          label="From"
          value={filters.dateFrom}
          max={filters.dateTo}
          onChange={(v) => update({ dateFrom: v })}
        />
        <DateInput
          id="filter-date-to"
          label="To"
          value={filters.dateTo}
          min={filters.dateFrom}
          onChange={(v) => update({ dateTo: v })}
        />
      </div>

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() =>
            onChange({ search: "", status: "", dateFrom: "", dateTo: "", assignee: "", department: "" })
          }
          className={cn(
            "inline-flex min-h-[44px] sm:min-h-9 h-11 sm:h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground",
            "hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Clear all filters"
        >
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
          Clear
        </button>
      )}
    </div>
  );
}
