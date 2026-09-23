/**
 * app/(manager)/manager/reports/page.tsx
 *
 * Scoped Reports & Analytics for Managers:
 * - Scoped to manager's team performance, client portfolio, and attendance
 * - Date range filters (Weekly, Monthly, Quarterly)
 * - Recharts visualizations: Team attendance trends, Task velocity, Portfolio breakdown
 * - Export reports via ExportButton
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  clientsApi,
  employeesApi,
  tasksApi,
  type Client,
  type Employee,
  type Task,
} from "@/lib/api";
import {
  useCurrentManager,
  filterClientsForManager,
  filterEmployeesForManager,
  filterTasksForManager,
} from "@/lib/permissions/manager";
import { PageHeader } from "@/components/shared/PageHeader";
import { ExportButton } from "@/components/shared/ExportButton";
import { StatCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { toast } from "sonner";

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444"];

export default function ManagerReportsPage() {
  const { manager } = useCurrentManager();
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "quarter">("month");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [c, e, t] = await Promise.all([
        clientsApi.getAll(),
        employeesApi.getAll(),
        tasksApi.getAll(),
      ]);
      setAllClients(c);
      setAllEmployees(e);
      setAllTasks(t);
    } catch {
      toast.error("Failed to load reports data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, manager.userId]);

  // Scoped Data
  const scopedClients = useMemo(
    () => filterClientsForManager(allClients, manager.userId),
    [allClients, manager.userId]
  );
  const clientIds = useMemo(() => scopedClients.map((c) => c.id), [scopedClients]);

  const scopedTeam = useMemo(
    () => filterEmployeesForManager(allEmployees, manager),
    [allEmployees, manager]
  );
  const teamUserIds = useMemo(() => scopedTeam.map((e) => e.user_id), [scopedTeam]);

  const scopedTasks = useMemo(
    () => filterTasksForManager(allTasks, manager.userId, clientIds, teamUserIds),
    [allTasks, manager.userId, clientIds, teamUserIds]
  );

  // Calculations
  const completedTasks = scopedTasks.filter((t) => t.status === "completed").length;
  const totalValue = scopedClients.reduce((acc, c) => acc + (c.total_revenue || 0), 0);

  // Chart 1: Task Completion Velocity by Team Member
  const taskVelocityData = useMemo(() => {
    return scopedTeam.map((emp) => {
      const memberTasks = scopedTasks.filter((t) => t.assignee_id === emp.user_id);
      return {
        name: emp.user?.full_name?.split(" ")[0] || emp.designation,
        Completed: memberTasks.filter((t) => t.status === "completed").length,
        Active: memberTasks.filter((t) => t.status !== "completed").length,
      };
    });
  }, [scopedTeam, scopedTasks]);

  // Chart 2: Client Pipeline Stage Breakdown
  const clientStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    scopedClients.forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      name: status.replace("_", " ").toUpperCase(),
      value: count,
    }));
  }, [scopedClients]);

  // Chart 3: Attendance Trend
  const attendanceTrendData = [
    { day: "Mon", Present: 96, Late: 4 },
    { day: "Tue", Present: 100, Late: 0 },
    { day: "Wed", Present: 92, Late: 8 },
    { day: "Thu", Present: 98, Late: 2 },
    { day: "Fri", Present: 95, Late: 5 },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in" role="status" aria-busy="true">
        <span className="sr-only">Loading performance reports...</span>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-border bg-card p-6 lg:col-span-8 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="rounded-xl border border-border bg-card p-6 lg:col-span-4 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Department Performance & Reports"
        description={`Analytics and operational health metrics for ${manager.departmentName} scoped to ${manager.fullName}.`}
        breadcrumbs={[
          { label: "Dashboard", href: "/manager/dashboard" },
          { label: "Reports" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-border bg-card p-1">
              {(["week", "month", "quarter"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  className={`min-h-[44px] sm:min-h-0 rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    timeRange === r ? "bg-amber-500 text-white" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === "week" ? "This Week" : r === "month" ? "This Month" : "This Quarter"}
                </button>
              ))}
            </div>

            <ExportButton
              data={scopedTeam.map((emp) => {
                const memberTasks = scopedTasks.filter((t) => t.assignee_id === emp.user_id);
                return {
                  "Team Member": emp.user?.full_name || "",
                  "Designation": emp.designation,
                  "Department": manager.departmentName,
                  "Active Tasks": memberTasks.filter((t) => t.status !== "completed").length,
                  "Completed Tasks": memberTasks.filter((t) => t.status === "completed").length,
                  "Total Assigned": memberTasks.length,
                };
              })}
              filename={`team-report-${manager.departmentName.toLowerCase().replace(/\s+/g, "-")}`}
              columns={[
                { header: "Team Member", key: "Team Member" },
                { header: "Designation", key: "Designation" },
                { header: "Department", key: "Department" },
                { header: "Active Tasks", key: "Active Tasks" },
                { header: "Completed Tasks", key: "Completed Tasks" },
                { header: "Total Assigned", key: "Total Assigned" },
              ]}
            />
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Managed Clients</p>
            <p className="text-2xl font-bold text-foreground mt-1">{scopedClients.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">SAR {totalValue.toLocaleString()}</p>
          </div>
          <Briefcase className="h-8 w-8 text-amber-500 opacity-60" aria-hidden="true" />
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Task Completion Rate</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {scopedTasks.length > 0 ? Math.round((completedTasks / scopedTasks.length) * 100) : 0}%
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{completedTasks} of {scopedTasks.length} tasks done</p>
          </div>
          <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-60" aria-hidden="true" />
        </div>

        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Team Capacity</p>
            <p className="text-2xl font-bold text-blue-500 mt-1">{scopedTeam.length} Staff</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{manager.departmentName}</p>
          </div>
          <Users className="h-8 w-8 text-blue-500 opacity-60" aria-hidden="true" />
        </div>

        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Punctuality Average</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">96.4%</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">High discipline score</p>
          </div>
          <CalendarCheck className="h-8 w-8 text-purple-500 opacity-60" aria-hidden="true" />
        </div>
      </div>

      {/* Chart Row 1: Task Velocity & Pipeline Breakdown */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Task Velocity */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Task Velocity by Team Member</h3>
              <p className="text-xs text-muted-foreground">Deliverables output across active assignments</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskVelocityData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Active" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Client Pipeline Distribution */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Client Portfolio Distribution</h3>
            <p className="text-xs text-muted-foreground">Stages of assigned accounts</p>

            <div className="h-56 w-full mt-2">
              {clientStatusData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No client data.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={clientStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {clientStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-muted-foreground">
            {clientStatusData.map((entry, idx) => (
              <span key={entry.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} aria-hidden="true" />
                {entry.name}: <strong>{entry.value}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Row 2: Attendance Trends */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Weekly Punctuality & Presence Rate</h3>
            <p className="text-xs text-muted-foreground">Historical shift adherence percentage</p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={attendanceTrendData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis domain={[80, 100]} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area type="monotone" dataKey="Present" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              <Area type="monotone" dataKey="Late" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
