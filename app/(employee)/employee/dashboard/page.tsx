/**
 * app/(employee)/employee/dashboard/page.tsx
 *
 * Modern Minimalist Employee Dashboard:
 * - Dynamic shift command center with interactive punch-in / punch-out session widget
 * - 4 Key productivity & attendance metric cards with visual progress
 * - Prioritized client work queue with interactive status toggle & priority filters
 * - Today's work schedule timeline
 * - Quick action grid for uploads, leave requests, and schedule
 * - Fully responsive across mobile, tablet, and desktop views
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Briefcase,
  Calendar,
  Clock,
  UploadCloud,
  Palmtree,
  ArrowRight,
  TrendingUp,
  PlayCircle,
  StopCircle,
  FileCheck2,
  ChevronRight,
  Building,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentEmployee } from "@/lib/permissions/employee";
import {
  tasksApi,
  deliverablesApi,
  workSchedulesApi,
  type Task,
  type WorkDeliverable,
  type WorkScheduleItem,
} from "@/lib/api";
import { Skeleton, StatCardSkeleton } from "@/components/ui/skeleton";

export default function EmployeeDashboardPage() {
  const { employee } = useCurrentEmployee();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deliverables, setDeliverables] = useState<WorkDeliverable[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<WorkScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskFilter, setTaskFilter] = useState<"all" | "active" | "urgent" | "completed">("all");

  // Live timer for punch-in session
  const [isPunchedIn, setIsPunchedIn] = useState(true);
  const [sessionMinutes, setSessionMinutes] = useState(315); // ~5h 15m

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [allTasks, allDelivs, allSchedules] = await Promise.all([
          tasksApi.getAll({ assigneeId: employee.userId }),
          deliverablesApi.getAll({ employeeUserId: employee.userId }),
          workSchedulesApi.getAll({ employeeId: employee.employeeId }),
        ]);

        setTasks(allTasks);
        setDeliverables(allDelivs);
        setTodaySchedule(allSchedules);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [employee.userId, employee.employeeId]);

  // Live clock interval while punched in
  useEffect(() => {
    if (!isPunchedIn) return;
    const interval = setInterval(() => {
      setSessionMinutes((m) => m + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, [isPunchedIn]);

  const handlePunchToggle = () => {
    if (isPunchedIn) {
      setIsPunchedIn(false);
      toast.success(`Clocked out at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Enjoy your evening!`);
    } else {
      setIsPunchedIn(true);
      toast.success("Clocked in successfully. Have a productive session!");
    }
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === "completed" ? "in_progress" : "completed";
    try {
      await tasksApi.updateStatus(task.id, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
      toast.success(
        newStatus === "completed"
          ? `Marked "${task.title}" as completed!`
          : `Re-opened "${task.title}" to in-progress.`
      );
    } catch {
      toast.error("Failed to update task status");
    }
  };

  const activeTasks = useMemo(() => tasks.filter((t) => t.status === "in_progress" || t.status === "todo"), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.status === "completed"), [tasks]);
  const urgentTasks = useMemo(() => tasks.filter((t) => t.priority === "urgent" || t.priority === "high"), [tasks]);
  const pendingDeliverables = useMemo(() => deliverables.filter((d) => d.status === "pending_review"), [deliverables]);

  const filteredTasks = useMemo(() => {
    if (taskFilter === "active") return activeTasks;
    if (taskFilter === "urgent") return urgentTasks;
    if (taskFilter === "completed") return completedTasks;
    return tasks;
  }, [tasks, activeTasks, urgentTasks, completedTasks, taskFilter]);

  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m < 10 ? `0${m}` : m}m`;
  };

  const shiftProgressPct = Math.min(100, Math.round((sessionMinutes / 480) * 100)); // 480m = 8h

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-busy="true">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 w-full rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* ── 1. Minimalist Shift Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-card via-card to-indigo-500/[0.04] p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                Active Shift: {employee.departmentName}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                • {employee.designation} • ID: {employee.employeeId}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Welcome back, {employee.fullName.split(" ")[0]}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
              Today is {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}. Here is your daily task agenda and scheduled client meetings.
            </p>
          </div>

          {/* Interactive Punch In / Out Widget */}
          <div className="flex items-center gap-3.5 rounded-2xl border border-border/80 bg-background/80 p-3 backdrop-blur shadow-xs shrink-0">
            <div className="text-right">
              <p className="text-[11px] font-medium text-muted-foreground">Today&apos;s Timesheet</p>
              <div className="flex items-center gap-1.5 justify-end">
                <p className="text-sm font-bold text-foreground font-mono">
                  {isPunchedIn ? formatHours(sessionMinutes) : "Clocked Out"}
                </p>
                {isPunchedIn && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    ({shiftProgressPct}%)
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handlePunchToggle}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white transition-all shadow-sm active:scale-95 ${
                isPunchedIn
                  ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20"
                  : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20"
              }`}
            >
              {isPunchedIn ? (
                <>
                  <StopCircle className="h-4 w-4" /> Clock Out
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" /> Clock In
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Minimalist Metric Cards ── */}
      {/* Mobile: 2 cols, Tablet/Desktop: 4 cols */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Assigned Tasks */}
        <Link
          href="/employee/client-work"
          className="group rounded-2xl border border-border/70 bg-card/95 p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-500/40"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned Tasks</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{activeTasks.length}</span>
            <span className="text-xs text-muted-foreground">active ({completedTasks.length} done)</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-semibold pt-2 border-t border-border/50">
            <span>Work queue</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Card 2: Today's Hours */}
        <Link
          href="/employee/attendance"
          className="group rounded-2xl border border-border/70 bg-card/95 p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-500/40"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today&apos;s Hours</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{formatHours(sessionMinutes)}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{shiftProgressPct}% of 8h</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold pt-2 border-t border-border/50">
            <span>Timesheet</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Card 3: Deliverables */}
        <Link
          href="/employee/work-upload"
          className="group rounded-2xl border border-border/70 bg-card/95 p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-amber-500/40"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deliverables</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <UploadCloud className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{deliverables.length}</span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">{pendingDeliverables.length} in review</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-semibold pt-2 border-t border-border/50">
            <span>Upload work</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Card 4: Leave Balance */}
        <Link
          href="/employee/leave"
          className="group rounded-2xl border border-border/70 bg-card/95 p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-sky-500/40"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Annual Leave</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Palmtree className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">18 Days</span>
            <span className="text-xs text-muted-foreground">of 24 balance</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-sky-600 dark:text-sky-400 font-semibold pt-2 border-t border-border/50">
            <span>Request leave</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      </div>

      {/* ── 3. Main Workspace Grid: Client Work Queue + Schedule + Actions ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols on lg): Work Queue & Daily Schedule */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Client Work Queue */}
          <div className="rounded-2xl border border-border/70 bg-card/95 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
              <div>
                <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Client Work Priorities
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Direct client assignments, sprint deliverables, and code reviews
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/30 p-1 self-start sm:self-auto overflow-x-auto no-scrollbar">
                {(["all", "active", "urgent", "completed"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setTaskFilter(tab)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-all shrink-0 ${
                      taskFilter === tab
                        ? "bg-card text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No client tasks match the selected filter.
              </div>
            ) : (
              <div className="divide-y divide-border/40 mt-2">
                {filteredTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 first:pt-2 last:pb-0 group"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            task.priority === "urgent"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : task.priority === "high"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                          }`}
                        >
                          {task.priority}
                        </span>
                        {task.client && (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                            <Building className="h-3 w-3" />
                            {task.client.company_name}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          • Due: {task.due_date}
                        </span>
                      </div>
                      <p className={`text-xs sm:text-sm font-semibold transition-colors line-clamp-1 ${
                        task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"
                      }`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                    </div>

                    <div className="flex items-center gap-2 sm:shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => handleToggleTaskStatus(task)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                          task.status === "completed"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                            : "border-border/80 bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {task.status === "completed" ? "Done" : "Mark Done"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Schedule Timeline */}
          <div className="rounded-2xl border border-border/70 bg-card/95 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
              <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Today&apos;s Work & Meeting Schedule
              </h2>
              <Link
                href="/employee/schedule"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                Full Calendar <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {todaySchedule.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {item.type === "client_meeting" ? (
                      <Building className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{item.title}</p>
                      <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                        {item.start_time.slice(11, 16)} - {item.end_time.slice(11, 16)}
                      </span>
                    </div>
                    {item.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.notes}</p>}
                    {item.client && (
                      <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                        Client: {item.client.company_name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Quick Actions, Uploads, Competencies */}
        <div className="space-y-6">
          {/* Quick Actions Grid */}
          <div className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/employee/work-upload"
                className="flex flex-col items-center justify-center rounded-xl border border-border/80 bg-background/80 p-3 text-center text-xs font-semibold text-foreground hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all active:scale-95"
              >
                <UploadCloud className="h-5 w-5 mb-1.5 text-indigo-600 dark:text-indigo-400" />
                Upload Work
              </Link>
              <Link
                href="/employee/leave"
                className="flex flex-col items-center justify-center rounded-xl border border-border/80 bg-background/80 p-3 text-center text-xs font-semibold text-foreground hover:bg-sky-500/10 hover:border-sky-500/30 hover:text-sky-600 dark:hover:text-sky-400 transition-all active:scale-95"
              >
                <Palmtree className="h-5 w-5 mb-1.5 text-sky-600 dark:text-sky-400" />
                Apply Leave
              </Link>
              <Link
                href="/employee/schedule"
                className="flex flex-col items-center justify-center rounded-xl border border-border/80 bg-background/80 p-3 text-center text-xs font-semibold text-foreground hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all active:scale-95"
              >
                <Calendar className="h-5 w-5 mb-1.5 text-emerald-600 dark:text-emerald-400" />
                Schedule
              </Link>
              <Link
                href="/employee/reports"
                className="flex flex-col items-center justify-center rounded-xl border border-border/80 bg-background/80 p-3 text-center text-xs font-semibold text-foreground hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-600 dark:hover:text-amber-400 transition-all active:scale-95"
              >
                <TrendingUp className="h-5 w-5 mb-1.5 text-amber-600 dark:text-amber-400" />
                My Report
              </Link>
            </div>
          </div>

          {/* Recent Work Deliverables Widget */}
          <div className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/60">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Recent Uploads
              </h2>
              <Link href="/employee/work-upload" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-2.5">
              {deliverables.slice(0, 3).map((deliv) => (
                <div key={deliv.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 hover:bg-muted/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground truncate">{deliv.title}</p>
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        deliv.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {deliv.status === "approved" ? "Approved" : "In Review"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {deliv.file_name} • {deliv.file_size}
                  </p>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5 font-medium">
                    {deliv.client?.company_name}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Competencies & Skills */}
          <div className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-foreground mb-2">My Competencies</h2>
            <div className="flex flex-wrap gap-1.5">
              {(employee.skills || ["Client Delivery", "Task Execution", "Quality Assurance", "Agile Workflow"]).map((skill) => (
                <span
                  key={skill}
                  className="rounded-lg border border-border/80 bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
