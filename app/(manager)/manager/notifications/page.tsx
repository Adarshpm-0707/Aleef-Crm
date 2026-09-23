/**
 * app/(manager)/manager/notifications/page.tsx
 *
 * Scoped Notifications Hub for Managers:
 * - Real-time alerts for leave requests, task reviews, client follow-ups
 * - Filter by category (all, unread, leaves, tasks, clients)
 * - Mark as read / Mark all as read with instant feedback
 * - Deep links to relevant task, client, or leave approval
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  notificationsApi,
  type AppNotification,
} from "@/lib/api";
import { useCurrentManager } from "@/lib/permissions/manager";
import { PageHeader } from "@/components/shared/PageHeader";
import { CardSkeleton } from "@/components/ui/skeleton";
import {
  Bell,
  CheckCheck,
  Check,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Briefcase,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";

const TYPE_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; label: string }
> = {
  leave_request: {
    icon: CalendarCheck,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    label: "Leave Request",
  },
  task_due: {
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    label: "Task Deadline",
  },
  task_assigned: {
    icon: CheckCircle2,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "Task Assignment",
  },
  client_assigned: {
    icon: Briefcase,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    label: "Client Update",
  },
  follow_up_due: {
    icon: Clock,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    label: "Follow-up Due",
  },
  system: {
    icon: Bell,
    color: "text-slate-500",
    bg: "bg-slate-500/10",
    label: "System",
  },
};

export default function ManagerNotificationsPage() {
  const { manager } = useCurrentManager();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "leaves" | "tasks" | "clients">("all");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationsApi.getAll(manager.userId);
      setNotifications(data);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [manager.userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      toast.success("Notification marked as read");
    } catch {
      toast.error("Failed to update notification");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead(manager.userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === "unread") return !n.is_read;
      if (filter === "leaves") return n.type === "leave_request" || n.type === "leave_approved" || n.type === "leave_rejected";
      if (filter === "tasks") return n.type === "task_assigned" || n.type === "task_updated" || n.type === "task_due";
      if (filter === "clients") return n.type === "client_assigned" || n.type === "follow_up_due" || n.type === "lead_updated";
      return true;
    });
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Notifications Center"
        description={`Direct notifications and operational alerts for ${manager.fullName}.`}
        breadcrumbs={[
          { label: "Dashboard", href: "/manager/dashboard" },
          { label: "Notifications" },
        ]}
        actions={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors"
            >
              <CheckCheck className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              <span>Mark All as Read</span>
            </button>
          ) : undefined
        }
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all" as const, label: "All Alerts", count: notifications.length },
            { id: "unread" as const, label: "Unread", count: unreadCount },
            { id: "leaves" as const, label: "Leave Requests", count: notifications.filter((n) => n.type.startsWith("leave")).length },
            { id: "tasks" as const, label: "Tasks", count: notifications.filter((n) => n.type.startsWith("task")).length },
            { id: "clients" as const, label: "Clients", count: notifications.filter((n) => n.type.includes("client") || n.type.includes("follow_up")).length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`flex min-h-[44px] sm:min-h-0 items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                filter === tab.id
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  filter === tab.id ? "bg-black/20 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="text-xs text-muted-foreground">
          {unreadCount} unread message(s)
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-3" role="status" aria-busy="true">
          <span className="sr-only">Loading notifications...</span>
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Inbox className="mx-auto h-12 w-12 text-muted-foreground opacity-50" aria-hidden="true" />
          <h3 className="mt-3 text-base font-semibold text-foreground">No notifications</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            You are all caught up on alerts in this category.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
            const Icon = config.icon;

            return (
              <div
                key={notif.id}
                className={`group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border p-4 shadow-card transition-all hover:shadow-card-hover ${
                  notif.is_read
                    ? "border-border bg-card"
                    : "border-amber-500/30 bg-amber-500/5"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${config.bg}`}>
                    <Icon className={`h-5 w-5 ${config.color}`} aria-hidden="true" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">{notif.title}</h4>
                      {!notif.is_read && (
                        <span className="h-2 w-2 rounded-full bg-amber-500" aria-label="Unread" />
                      )}
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{notif.message}</p>
                    <span className="text-[10px] text-muted-foreground block pt-0.5">
                      {new Date(notif.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  {notif.link && (
                    <Link
                      href={notif.link}
                      className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors"
                    >
                      <span>Open</span>
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  )}
                  {!notif.is_read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(notif.id)}
                      title="Mark as read"
                      aria-label="Mark as read"
                      className="inline-flex min-h-[44px] min-w-[44px] sm:min-h-8 sm:min-w-8 h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors"
                    >
                      <Check className="h-4 w-4 text-emerald-500" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
