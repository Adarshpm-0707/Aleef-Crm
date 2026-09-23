/**
 * app/(employee)/employee/progress/page.tsx
 *
 * Progress Track — Monitor project milestones, quarterly OKRs,
 * sprint deliverables, and personal task completion velocity.
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Target,
  CheckCircle2,
  Clock,
  Building,
  Award,
  Flame,
} from "lucide-react";
import { useCurrentEmployee } from "@/lib/permissions/employee";
import { projectsApi, tasksApi, type Project, type Task } from "@/lib/api";

export default function ProgressTrackPage() {
  const { employee } = useCurrentEmployee();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [allProjects, empTasks] = await Promise.all([
          projectsApi.getAll(),
          tasksApi.getAll({ assigneeId: employee.userId }),
        ]);
        setProjects(allProjects);
        setTasks(empTasks);
      } catch (err) {
        console.error("Failed to load progress data:", err);
      }
    }
    loadData();
  }, [employee.userId]);

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const reviewCount = tasks.filter((t) => t.status === "review").length;
  const totalTasks = tasks.length || 1;
  const completionRate = Math.round((completedCount / totalTasks) * 100);

  const okrs = [
    {
      title: "Client SLA Performance & Uptime",
      description: "Ensure 99.5% uptime on integrated client pipelines and APIs.",
      progress: 98,
      target: "99.5%",
      current: "99.2%",
      status: "on_track",
    },
    {
      title: "Sprint Deliverable Execution",
      description: "Deliver all Q3 client roadmap deliverables on or before due date.",
      progress: 85,
      target: "100%",
      current: "85%",
      status: "on_track",
    },
    {
      title: "Security & Schema Compliance",
      description: "Zero high-severity vulnerabilities and complete HL7/FHIR validation.",
      progress: 90,
      target: "100%",
      current: "90%",
      status: "ahead",
    },
    {
      title: "Customer Satisfaction Index",
      description: "Maintain an average client satisfaction rating > 4.8 / 5.0.",
      progress: 96,
      target: "4.8/5.0",
      current: "4.9/5.0",
      status: "ahead",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <TrendingUp className="h-6 w-6 text-indigo-400" />
          Progress & Milestone Tracking
        </h1>
        <p className="text-sm text-muted-foreground">
          Track personal execution velocity, client project deliverables, and quarterly goal achievements
        </p>
      </div>

      {/* Progress Metric Highlights */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-indigo-500/20 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sprint Completion</p>
            <Flame className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{completionRate}%</span>
            <span className="text-xs text-indigo-400 font-medium">{completedCount} of {tasks.length} tasks</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${completionRate}%` }} />
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">In Review</p>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{reviewCount}</span>
            <span className="text-xs text-muted-foreground">ready for sign-off</span>
          </div>
          <p className="mt-3 text-xs text-emerald-400 font-medium">Pending client check</p>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active In-Flight</p>
            <Clock className="h-5 w-5 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{inProgressCount}</span>
            <span className="text-xs text-muted-foreground">work packages</span>
          </div>
          <p className="mt-3 text-xs text-amber-400 font-medium">Daily focus queue</p>
        </div>

        <div className="rounded-xl border border-sky-500/20 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overall Health</p>
            <Award className="h-5 w-5 text-sky-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">94%</span>
            <span className="text-xs text-sky-400 font-medium">Excellent</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Based on SLA punctuality</p>
        </div>
      </div>

      {/* Main Grid: Projects & Quarterly OKRs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Client Projects Milestones */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Building className="h-4 w-4 text-indigo-400" />
              Client Projects & Milestones
            </h2>
            <span className="text-xs font-medium text-muted-foreground">Active Workstreams</span>
          </div>

          <div className="space-y-4">
            {projects.slice(0, 3).map((project) => (
              <div key={project.id} className="rounded-xl border border-border bg-background/50 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-indigo-400">
                      {project.client?.company_name || "Enterprise Client"}
                    </span>
                    <h3 className="text-sm font-bold text-foreground mt-0.5">{project.name}</h3>
                  </div>
                  <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-xs font-bold text-indigo-400">
                    {project.progress || 65}%
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${project.progress || 65}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Due: {project.end_date || "2026-10-31"}</span>
                  <span className="text-emerald-400 font-medium">Phase 2 / Milestone In Progress</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quarterly OKRs / Personal Goals */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-400" />
              Quarterly Objectives (Q3 2026)
            </h2>
            <span className="text-xs font-medium text-muted-foreground">Department Targets</span>
          </div>

          <div className="space-y-4">
            {okrs.map((okr, index) => (
              <div key={index} className="rounded-xl border border-border bg-background/50 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{okr.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{okr.description}</p>
                  </div>
                  <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                    {okr.status.replace("_", " ")}
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${okr.progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Target: {okr.target}</span>
                  <span className="font-semibold text-foreground">Current: {okr.current}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Accomplishment Timeline */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-400" />
          Recent Accomplishments & Milestone Completions
        </h3>

        <div className="space-y-3">
          {[
            {
              title: "Delivered Kafka telemetry ingestion benchmark tests",
              date: "September 21, 2026",
              client: "Apex Global Logistics",
              type: "Approved Deliverable",
            },
            {
              title: "Resolved iOS Safari map clustering rendering stutter",
              date: "September 18, 2026",
              client: "Apex Global Logistics",
              type: "Bug Resolution",
            },
            {
              title: "Completed HL7 FHIR payload encryption architecture",
              date: "September 15, 2026",
              client: "CarePlus Healthcare",
              type: "Architecture Spec",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/40 p-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="text-muted-foreground">{item.client} • {item.type}</p>
                </div>
              </div>
              <span className="text-muted-foreground sm:text-right font-mono text-[11px]">{item.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
