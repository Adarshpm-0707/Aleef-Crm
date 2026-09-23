/**
 * ClientCard — compact card representing a CRM client.
 * Shows avatar, name, company, status badge, KPIs.
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";

/* ─── Types ────────────────────────────────────────────────────────────────── */

export type ClientStatus = "active" | "inactive" | "prospect" | "churned";

export interface CRMClient {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  status: ClientStatus;
  avatarUrl?: string;
  revenue?: number;
  dealCount?: number;
  lastContact?: string; // ISO date
  tags?: string[];
}

export interface ClientCardProps {
  client: CRMClient;
  onClick?: (client: CRMClient) => void;
  onEdit?: (client: CRMClient) => void;
  onCall?: (client: CRMClient) => void;
  className?: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

const STATUS_STYLES: Record<ClientStatus, string> = {
  active:   "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  inactive: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  prospect: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  churned:  "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

function Initials({ name }: { name: string }) {
  const parts = name.split(" ");
  return (parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase();
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export function ClientCard({ client, onClick, onEdit, onCall, className }: ClientCardProps) {
  const daysSinceContact = client.lastContact
    ? Math.floor((Date.now() - new Date(client.lastContact).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <article
      aria-label={`Client: ${client.name}`}
      className={cn(
        "group relative flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-all duration-200",
        "hover:shadow-card-hover hover:-translate-y-0.5",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={() => onClick?.(client)}
      role={onClick ? "button" : "article"}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(client); } : undefined}
    >
      {/* Top row: avatar + status + actions */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {client.avatarUrl ? (
            <img
              src={client.avatarUrl}
              alt={client.name}
              className="h-11 w-11 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-500/20 text-sm font-bold text-teal-600 ring-2 ring-teal-500/20">
              <Initials name={client.name} />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{client.name}</p>
            {client.company && (
              <p className="truncate text-xs text-muted-foreground">{client.company}</p>
            )}
          </div>
        </div>

        <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", STATUS_STYLES[client.status])}>
          {client.status}
        </span>
      </div>

      {/* Tags */}
      {client.tags && client.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {client.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
              {tag}
            </span>
          ))}
          {client.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{client.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/40 p-2.5 text-center">
          <p className="text-lg font-bold text-foreground">
            {client.revenue != null
              ? `$${client.revenue >= 1000 ? `${(client.revenue / 1000).toFixed(1)}k` : client.revenue}`
              : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">Revenue</p>
        </div>
        <div className="rounded-xl bg-muted/40 p-2.5 text-center">
          <p className="text-lg font-bold text-foreground">{client.dealCount ?? "—"}</p>
          <p className="text-[10px] text-muted-foreground">Deals</p>
        </div>
      </div>

      {/* Last contact */}
      {daysSinceContact !== null && (
        <p className="mb-4 text-xs text-muted-foreground">
          Last contact:{" "}
          <span className={cn("font-medium", daysSinceContact > 30 ? "text-warning" : "text-foreground")}>
            {daysSinceContact === 0 ? "Today" : daysSinceContact === 1 ? "Yesterday" : `${daysSinceContact}d ago`}
          </span>
        </p>
      )}

      {/* Action buttons */}
      <div className="mt-auto flex gap-2">
        {client.email && (
          <a
            href={`mailto:${client.email}`}
            aria-label={`Email ${client.name}`}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-xs font-medium text-foreground",
              "hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Email
          </a>
        )}
        {onCall && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCall(client); }}
            aria-label={`Call ${client.name}`}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-xs font-medium text-foreground",
              "hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            Call
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(client); }}
            aria-label={`Edit ${client.name}`}
            className={cn(
              "rounded-lg border border-border p-1.5 text-muted-foreground",
              "hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
        )}
      </div>
    </article>
  );
}
