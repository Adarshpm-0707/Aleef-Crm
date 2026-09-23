/**
 * ExportButton — exports data to CSV, PDF, or Excel.
 * Fully client-side; no server round-trip required.
 *
 * Usage:
 *   <ExportButton
 *     filename="clients"
 *     columns={[{ key: "name", header: "Name" }, ...]}
 *     data={rows}
 *   />
 */

"use client";

import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";

/* ─── Types ────────────────────────────────────────────────────────────────── */

export interface ExportColumn {
  key: string;
  header: string;
}

export type ExportFormat = "csv" | "pdf" | "excel";

export interface ExportButtonProps {
  /** Base file name (without extension) */
  filename?: string;
  columns: ExportColumn[];
  data: Record<string, unknown>[];
  disabled?: boolean;
  className?: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function toCsv(columns: ExportColumn[], data: Record<string, unknown>[]): string {
  const headers = columns.map((c) => `"${c.header}"`).join(",");
  const rows = data.map((row) =>
    columns.map((c) => {
      const val = row[c.key] ?? "";
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(","),
  );
  return [headers, ...rows].join("\r\n");
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export function ExportButton({
  filename = "export",
  columns,
  data,
  disabled = false,
  className,
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /* close on outside click */
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  /* keyboard navigation */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  };

  async function handleExport(format: ExportFormat) {
    setLoading(format);
    try {
      if (format === "csv") {
        const csv = toCsv(columns, data);
        downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
      } else if (format === "excel") {
        const { utils, write } = await import("xlsx");
        const ws = utils.json_to_sheet(
          data.map((row) =>
            Object.fromEntries(columns.map((c) => [c.header, row[c.key] ?? ""])),
          ),
        );
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Data");
        const buf = write(wb, { type: "array", bookType: "xlsx" });
        downloadBlob(
          new Blob([buf], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
          `${filename}.xlsx`,
        );
      } else if (format === "pdf") {
        const { default: jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");
        const doc = new jsPDF({ orientation: "landscape" });
        autoTable(doc, {
          head: [columns.map((c) => c.header)],
          body: data.map((row) => columns.map((c) => String(row[c.key] ?? ""))),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [13, 148, 136] },
        });
        doc.save(`${filename}.pdf`);
      }
    } finally {
      setLoading(null);
      setOpen(false);
    }
  }

  const options: { format: ExportFormat; label: string; icon: string }[] = [
    { format: "csv",   label: "Export as CSV",   icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { format: "excel", label: "Export as Excel", icon: "M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
    { format: "pdf",   label: "Export as PDF",   icon: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  ];

  return (
    <div ref={menuRef} className={cn("relative inline-block", className)} onKeyDown={handleKeyDown}>
      <button
        type="button"
        id="export-button-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Export data"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition-all",
          "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        {/* Download icon */}
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          className="h-4 w-4"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Export
        {/* Chevron */}
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          aria-label="Export options"
          className={cn(
            "absolute right-0 z-50 mt-2 w-52 origin-top-right rounded-xl border border-border bg-popover shadow-lg",
            "animate-scale-in py-1",
          )}
        >
          {options.map(({ format, label, icon }) => (
            <button
              key={format}
              role="menuitem"
              disabled={loading !== null}
              onClick={() => handleExport(format)}
              className={cn(
                "flex w-full items-center gap-3 px-3.5 py-2.5 text-sm text-foreground transition-colors",
                "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                "disabled:opacity-50",
              )}
            >
              {loading === format ? (
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  className="h-4 w-4 text-muted-foreground"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
              )}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
