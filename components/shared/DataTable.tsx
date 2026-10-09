/**
 * DataTable — sortable, filterable, paginated data table.
 * On mobile (< md) rows collapse to card layout automatically.
 *
 * Features:
 *  - Column-level sort (asc/desc toggle)
 *  - Global search + per-column renders
 *  - Pagination (configurable page sizes)
 *  - Responsive: table on md+, cards on xs/sm
 *  - Full ARIA markup (grid role, column sort)
 */

"use client";

import React, { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";
import { TableSkeleton } from "@/components/ui/skeleton";

/* ─── Types ────────────────────────────────────────────────────────────────── */

export type SortDir = "asc" | "desc";

export interface ColumnDef<T> {
  /** Unique key (must match a key of T, or be a synthetic key) */
  key: string;
  header: string;
  /** Custom cell renderer */
  cell?: (row: T, index: number) => React.ReactNode;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Additional className for <td> / card row */
  className?: string;
  /** Hide on mobile card view */
  hideOnCard?: boolean;
}

export interface DataTableProps<T extends object> {
  columns: ColumnDef<T>[];
  data: T[];
  /** Whether data is currently loading */
  loading?: boolean;
  /** Row identifier key (defaults to "id") */
  rowKey?: keyof T;
  /** Whether to show a global search bar (defaults to true) */
  searchable?: boolean;
  pageSizes?: number[];
  defaultPageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  onRowClick?: (row: T) => void;
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function getValue(row: object, key: string): unknown {
  return key.split(".").reduce((acc: unknown, part) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[part];
    return undefined;
  }, row as unknown as Record<string, unknown>);
}

function sortRows<T extends object>(
  rows: T[],
  key: string,
  dir: SortDir,
): T[] {
  return [...rows].sort((a, b) => {
    const av = getValue(a, key);
    const bv = getValue(b, key);
    if (av === bv) return 0;
    const result = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
    return dir === "asc" ? result : -result;
  });
}

function filterRows<T extends object>(rows: T[], search: string): T[] {
  if (!search.trim()) return rows;
  const q = search.toLowerCase();
  return rows.filter((row) =>
    Object.values(row as unknown as Record<string, unknown>).some((v) => String(v ?? "").toLowerCase().includes(q)),
  );
}

/* ─── Sort icon ─────────────────────────────────────────────────────────────── */

function SortIcon({ dir }: { dir: SortDir | null }) {
  if (!dir)
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 opacity-30">
        <path d="M5 8l3-4 3 4H5zM5 9l3 4 3-4H5z" />
      </svg>
    );
  if (dir === "asc")
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-primary">
        <path d="M5 9l3-4 3 4H5z" />
      </svg>
    );
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-primary">
      <path d="M5 7l3 4 3-4H5z" />
    </svg>
  );
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  rowKey = "id" as keyof T,
  searchable = true,
  pageSizes = [10, 25, 50, 100],
  defaultPageSize = 10,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your search or filters.",
  className,
  onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  /* ── Sort handler ── */
  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
      setPage(1);
    },
    [sortKey],
  );

  /* ── Derived data ── */
  const processed = useMemo(() => {
    let rows = filterRows(data, search);
    if (sortKey) rows = sortRows(rows, sortKey, sortDir);
    return rows;
  }, [data, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));
  const paginated = useMemo(
    () => processed.slice((page - 1) * pageSize, page * pageSize),
    [processed, page, pageSize],
  );

  /* reset page when search changes */
  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const startItem = processed.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, processed.length);

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── Search + page size ── */}
      {searchable && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
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
              type="search"
              placeholder="Search…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              aria-label="Search records"
              className={cn(
                "min-h-[44px] sm:min-h-9 h-11 sm:h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <label htmlFor="table-page-size">Show</label>
            <select
              id="table-page-size"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="min-h-[44px] sm:min-h-9 h-11 sm:h-9 rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              {pageSizes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span>per page</span>
          </div>
        </div>
      )}

      {/* ─── Desktop table / Mobile cards / Loading state ─── */}
      {loading ? (
        <TableSkeleton cols={columns.length} rows={pageSize > 10 ? 8 : 5} />
      ) : paginated.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          {/* ── TABLE (md+) ── */}
          <div className="hidden overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-xs md:block">
            <table
              role="grid"
              aria-label="Data table"
              className="min-w-full divide-y divide-border/60 text-sm"
            >
              <thead className="bg-muted/40">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={
                        sortKey === col.key
                          ? sortDir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                      className={cn(
                        "whitespace-nowrap px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                        col.sortable && "cursor-pointer select-none hover:text-foreground",
                        col.className,
                      )}
                      onClick={col.sortable ? () => handleSort(col.key) : undefined}
                      onKeyDown={
                        col.sortable
                          ? (e) => { if (e.key === "Enter" || e.key === " ") handleSort(col.key); }
                          : undefined
                      }
                      tabIndex={col.sortable ? 0 : undefined}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {col.header}
                        {col.sortable && (
                          <SortIcon dir={sortKey === col.key ? sortDir : null} />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 bg-card">
                {paginated.map((row, ri) => {
                  const key = String(row[rowKey] ?? ri);
                  return (
                    <tr
                      key={key}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      onKeyDown={
                        onRowClick
                          ? (e) => { if (e.key === "Enter") onRowClick(row); }
                          : undefined
                      }
                      tabIndex={onRowClick ? 0 : undefined}
                      role={onRowClick ? "button" : "row"}
                      className={cn(
                        "transition-colors",
                        onRowClick && "cursor-pointer hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none",
                      )}
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn("px-4 py-3.5 text-sm text-foreground", col.className)}
                        >
                          {col.cell
                            ? col.cell(row, ri)
                            : String(getValue(row, col.key) ?? "—")}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── CARDS (xs/sm) ── */}
          <div className="space-y-3 md:hidden">
            {paginated.map((row, ri) => {
              const key = String(row[rowKey] ?? ri);
              return (
                <div
                  key={key}
                  role={onRowClick ? "button" : "article"}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => { if (e.key === "Enter") onRowClick(row); }
                      : undefined
                  }
                  className={cn(
                    "rounded-2xl border border-border/70 bg-card p-4 shadow-xs",
                    onRowClick && "cursor-pointer hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  {columns
                    .filter((c) => !c.hideOnCard)
                    .map((col) => (
                      <div key={col.key} className="flex items-start justify-between py-1.5 text-sm">
                        <span className="font-medium text-muted-foreground">{col.header}</span>
                        <span className="ml-4 text-right text-foreground">
                          {col.cell
                            ? col.cell(row, ri)
                            : String(getValue(row, col.key) ?? "—")}
                        </span>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Pagination ── */}
      {processed.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            Showing {startItem}–{endItem} of {processed.length}
          </p>

          <div className="flex items-center gap-1" role="navigation" aria-label="Pagination">
            {/* Previous */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
              className={cn(
                "inline-flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-border text-foreground transition-colors",
                "hover:bg-muted disabled:pointer-events-none disabled:opacity-40",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((item, i) =>
                item === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    aria-label={`Page ${item}`}
                    aria-current={page === item ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      page === item
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-foreground hover:bg-muted",
                    )}
                  >
                    {item}
                  </button>
                ),
              )}

            {/* Next */}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
              className={cn(
                "inline-flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-border text-foreground transition-colors",
                "hover:bg-muted disabled:pointer-events-none disabled:opacity-40",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
