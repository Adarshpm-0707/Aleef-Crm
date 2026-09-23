/**
 * Timeline — vertical activity timeline for a CRM client/lead.
 * Shows calls, emails, meetings, notes, status changes.
 */

"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

/* ─── Types ────────────────────────────────────────────────────────────────── */

export type TimelineEventType =
  | "call"
  | "email"
  | "meeting"
  | "note"
  | "status-change"
  | "deal"
  | "document";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  createdAt: string; // ISO
  author?: { name: string; avatarUrl?: string };
  metadata?: Record<string, string>;
}

export interface TimelineProps {
  events: TimelineEvent[];
  /** If true, shows a "Add note" quick input */
  canAddNote?: boolean;
  onAddNote?: (note: string) => void;
  className?: string;
}

/* ─── Config ────────────────────────────────────────────────────────────────── */

const EVENT_CONFIG: Record<
  TimelineEventType,
  { icon: string; color: string; bg: string }
> = {
  call: {
    icon: "M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/15",
  },
  email: {
    icon: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75",
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/15",
  },
  meeting: {
    icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/15",
  },
  note: {
    icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/15",
  },
  "status-change": {
    icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-500/15",
  },
  deal: {
    icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/15",
  },
  document: {
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-500/15",
  },
};

function formatRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export function Timeline({ events, canAddNote = false, onAddNote, className }: TimelineProps) {
  const [noteText, setNoteText] = useState("");
  const [filter, setFilter] = useState<TimelineEventType | "all">("all");

  const sorted = [...events].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const filtered = filter === "all" ? sorted : sorted.filter((e) => e.type === filter);

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    onAddNote?.(noteText.trim());
    setNoteText("");
  };

  const filterTypes: (TimelineEventType | "all")[] = ["all", "call", "email", "meeting", "note", "deal"];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter timeline events">
        {filterTypes.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={filter === t}
            onClick={() => setFilter(t)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              filter === t
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Add note */}
      {canAddNote && (
        <div className="flex gap-2">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddNote(); }}
            placeholder="Add a note…"
            aria-label="New note"
            className={cn(
              "flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          />
          <button
            type="button"
            onClick={handleAddNote}
            disabled={!noteText.trim()}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Add
          </button>
        </div>
      )}

      {/* Events */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No events to show.</p>
      ) : (
        <ol aria-label="Activity timeline" className="relative space-y-0">
          {filtered.map((event, i) => {
            const cfg = EVENT_CONFIG[event.type];
            const isLast = i === filtered.length - 1;
            return (
              <li key={event.id} className="relative flex gap-4 pb-6">
                {/* Connector line */}
                {!isLast && (
                  <span aria-hidden="true" className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border" />
                )}

                {/* Icon */}
                <div
                  aria-hidden="true"
                  className={cn(
                    "relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                    cfg.bg,
                  )}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.75}
                    stroke="currentColor"
                    className={cn("h-4 w-4", cfg.color)}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
                  </svg>
                </div>

                {/* Content */}
                <div className="flex-1 pt-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{event.title}</p>
                    <time
                      dateTime={event.createdAt}
                      className="flex-shrink-0 text-xs text-muted-foreground"
                      title={new Date(event.createdAt).toLocaleString()}
                    >
                      {formatRelative(event.createdAt)}
                    </time>
                  </div>

                  {event.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{event.description}</p>
                  )}

                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(event.metadata).map(([k, v]) => (
                        <span key={k} className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {k}: {v}
                        </span>
                      ))}
                    </div>
                  )}

                  {event.author && (
                    <p className="mt-1.5 text-xs text-muted-foreground">by {event.author.name}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
