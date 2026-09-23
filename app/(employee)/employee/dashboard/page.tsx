/**
 * app/(employee)/employee/dashboard/page.tsx
 *
 * Employee Dashboard — Unified command center for daily work execution,
 * attendance check-in, scheduled meetings, assigned client tasks, and deliverables.
 */

"use client";

import React, { useState, useEffect } from "react";
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

export default function EmployeeDashboardPage() {
  const { employee } = useCurrentEmployee();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deliverables, setDeliverables] = useState<WorkDeliverable[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<WorkScheduleItem[]>([]);

  // Live timer for punch-in session
  const [isPunchedIn, setIsPunchedIn] = useState(true);
  const elapsedMinutes = 315; // ~5h 15m

  useEffect(() => {
    async function loadData() {
      try {
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
      }
    }

    loadData();
  }, [employee.userId, employee.employeeId]);

  const handlePunchToggle = () => {
    if (isPunchedIn) {
      setIsPunchedIn(false);
      toast.success("Clocked out successfully at " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else {
      setIsPunchedIn(true);
      toast.success("Clocked in successfully. Have a productive day!");
    }
  };

  const activeTasks = tasks.filter((t) => t.status === "in_progress" || t.status === "todo");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const pendingDeliverables = deliverables.filter((d) => d.status === "pending_review");

  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-background to-background p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Active Shift: {employee.departmentName}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Welcome back, {employee.fullName.split(" ")[0]}! 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              {employee.designation} • ID: {employee.employeeId} •{" "}
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>

          {/* Quick Punch Widget */}
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3 backdrop-blur">
            <div className="text-right">
              <p className="text-xs font-medium text-muted-foreground">Today&apos;s Clock</p>
              <p className="text-sm font-bold text-foreground">
                {isPunchedIn ? formatHours(elapsedMinutes) : "Clocked Out"}
              </p>
            </div>
            <button
              onClick={handlePunchToggle}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all shadow-sm ${
                isPunchedIn
                  ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20"
                  : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20"
              }`}
            >
              {isPunchedIn ? (
                <>
                  <StopCircle className="h-4 w-4" /> Punch Out
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" /> Punch In
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Active Tasks */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned Tasks</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{activeTasks.length}</span>
            <span className="text-xs text-muted-foreground">active ({completedTasks.length} completed)</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-indigo-400 font-medium pt-2 border-t border-border/50">
            <Link href="/employee/client-work" className="hover:underline flex items-center gap-1">
              View task queue <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Card 2: Today's Hours */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today&apos;s Hours</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">5.25 hrs</span>
            <span className="text-xs text-emerald-500 font-medium">65% of 8h goal</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-emerald-400 font-medium pt-2 border-t border-border/50">
            <Link href="/employee/attendance" className="hover:underline flex items-center gap-1">
              Timesheet logs <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: Deliverables */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Work Uploads</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <UploadCloud className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{deliverables.length}</span>
            <span className="text-xs text-amber-500 font-medium">{pendingDeliverables.length} under review</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-amber-400 font-medium pt-2 border-t border-border/50">
            <Link href="/employee/work-upload" className="hover:underline flex items-center gap-1">
              Upload deliverables <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Card 4: Leave Balance */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-sky-500/30 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Annual Leave</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
              <Palmtree className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">18 Days</span>
            <span className="text-xs text-muted-foreground">of 24 available</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-sky-400 font-medium pt-2 border-t border-border/50">
            <Link href="/employee/leave" className="hover:underline flex items-center gap-1">
              Apply for leave <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Work Schedule & Active Client Work */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Client Work Queue */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Client Tasks Section */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-indigo-400" />
                  Assigned Client Work
                </h2>
                <p className="text-xs text-muted-foreground">Prioritized client deliverables and engineering tasks</p>
              </div>
              <Link
                href="/employee/client-work"
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                All tasks <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {tasks.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No client tasks currently assigned to your queue.
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-background/50 p-3.5 hover:border-indigo-500/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            task.priority === "urgent"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : task.priority === "high"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          }`}
                        >
                          {task.priority}
                        </span>
                        {task.client && (
                          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <Building className="h-3 w-3" />
                            {task.client.company_name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground line-clamp-1">{task.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                    </div>

                    <div className="flex items-center gap-3 sm:flex-shrink-0">
                      <span className="text-xs text-muted-foreground">Due: {task.due_date}</span>
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-medium ${
                          task.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : task.status === "in_progress"
                            ? "bg-indigo-500/10 text-indigo-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Work Schedule */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-400" />
                  Today&apos;s Work Schedule
                </h2>
                <p className="text-xs text-muted-foreground">Scheduled meetings, shift blocks, and focus time</p>
              </div>
              <Link
                href="/employee/schedule"
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                Full Calendar <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {todaySchedule.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border border-border/80 bg-background/40 p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 flex-shrink-0 mt-0.5">
                    {item.type === "client_meeting" ? (
                      <Building className="h-4 w-4" />
                    ) : item.type === "shift" ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <FileCheck2 className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <span className="text-xs font-mono text-muted-foreground">
                        {item.start_time.slice(11, 16)} - {item.end_time.slice(11, 16)}
                      </span>
                    </div>
                    {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                    {item.client && (
                      <p className="text-[11px] text-indigo-400 mt-1 font-medium">
                        Client: {item.client.company_name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Actions & Recent Deliverables */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/employee/work-upload"
                className="flex flex-col items-center justify-center rounded-lg border border-border bg-background/50 p-3 text-center text-xs font-medium text-foreground hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400 transition-all"
              >
                <UploadCloud className="h-5 w-5 mb-1.5 text-indigo-400" />
                Upload Work
              </Link>
              <Link
                href="/employee/leave"
                className="flex flex-col items-center justify-center rounded-lg border border-border bg-background/50 p-3 text-center text-xs font-medium text-foreground hover:bg-sky-500/10 hover:border-sky-500/30 hover:text-sky-400 transition-all"
              >
                <Palmtree className="h-5 w-5 mb-1.5 text-sky-400" />
                Apply Leave
              </Link>
              <Link
                href="/employee/schedule"
                className="flex flex-col items-center justify-center rounded-lg border border-border bg-background/50 p-3 text-center text-xs font-medium text-foreground hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 transition-all"
              >
                <Calendar className="h-5 w-5 mb-1.5 text-emerald-400" />
                Schedule
              </Link>
              <Link
                href="/employee/reports"
                className="flex flex-col items-center justify-center rounded-lg border border-border bg-background/50 p-3 text-center text-xs font-medium text-foreground hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400 transition-all"
              >
                <TrendingUp className="h-5 w-5 mb-1.5 text-amber-400" />
                My Report
              </Link>
            </div>
          </div>

          {/* Recent Deliverables Widget */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-indigo-400" />
                Recent Uploads
              </h2>
              <Link href="/employee/work-upload" className="text-xs font-medium text-indigo-400 hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {deliverables.slice(0, 3).map((deliv) => (
                <div key={deliv.id} className="rounded-lg border border-border bg-background/40 p-3">
                  <div className="flex items-start justify-between">
                    <p className="text-xs font-semibold text-foreground line-clamp-1">{deliv.title}</p>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        deliv.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {deliv.status === "approved" ? "Approved" : "In Review"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {deliv.file_name} • {deliv.file_size}
                  </p>
                  <p className="text-[10px] text-indigo-400 mt-1">{deliv.client?.company_name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Skills & Badges */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-2">My Competencies</h2>
            <div className="flex flex-wrap gap-1.5">
              {(employee.skills || ["Client Delivery", "Task Execution", "Quality Assurance"]).map((skill) => (
                <span
                  key={skill}
                  className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
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
