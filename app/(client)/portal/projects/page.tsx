/**
 * app/(client)/portal/projects/page.tsx
 *
 * Client Portal: Projects Directory
 * Shows all projects belonging to the client with live progress breakdown
 * (todo, in_progress, review, completed), milestone timelines, and link to workspace.
 * Completely excludes admin/manager project creation or editing controls.
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  projectsApi,
  tasksApi,
  type Project,
  type Task,
} from "@/lib/api";
import {
  useCurrentClient,
  filterProjectsForClient,
  filterTasksForClient,
  calculateTaskBreakdown,
} from "@/lib/permissions/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { CardSkeleton } from "@/components/ui/skeleton";
import {
  FolderKanban,
  Search,
  Calendar,
  Clock,
  ArrowRight,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

export default function ClientProjectsPage() {
  const { client } = useCurrentClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [projList, taskList] = await Promise.all([
        projectsApi.getAll(),
        tasksApi.getAll(),
      ]);
      setProjects(projList);
      setTasks(taskList);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, client.clientId]);

  // Scoped to active client
  const clientProjects = useMemo(
    () => filterProjectsForClient(projects, client.clientId),
    [projects, client.clientId]
  );

  const clientTasks = useMemo(
    () => filterTasksForClient(tasks, client.clientId, clientProjects),
    [tasks, client.clientId, clientProjects]
  );

  // Filtered list
  const filteredProjects = useMemo(() => {
    return clientProjects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clientProjects, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Projects & Workspaces"
        description={`Active deliverables, roadmap milestones, and technical workspaces for ${client.companyName}`}
        breadcrumbs={[
          { label: "Client Portal", href: "/portal/dashboard" },
          { label: "Projects" },
        ]}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-4 shadow-card">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <label htmlFor="projects-search" className="sr-only">Search projects by name or keywords</label>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="projects-search"
            type="text"
            placeholder="Search projects by name or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 transition-colors"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          {[
            { value: "all", label: "All Projects" },
            { value: "active", label: "Active" },
            { value: "planning", label: "Planning" },
            { value: "completed", label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`min-h-[44px] sm:min-h-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                statusFilter === tab.value
                  ? "bg-sky-500 text-white shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Projects List Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2" role="status" aria-busy="true">
          <span className="sr-only">Loading client workspaces...</span>
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground/60" aria-hidden="true" />
          <h3 className="mt-3 text-base font-semibold text-foreground">No projects found</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {searchTerm || statusFilter !== "all"
              ? "No projects matched your search criteria. Try adjusting your filters."
              : "No active projects are currently linked to this client account."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredProjects.map((project) => {
            const projectTasks = clientTasks.filter((t) => t.project_id === project.id);
            const breakdown = calculateTaskBreakdown(projectTasks);

            return (
              <div
                key={project.id}
                className="flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-card hover:border-sky-500/40 hover:shadow-card-hover transition-all"
              >
                <div>
                  {/* Top: Name & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-foreground hover:text-sky-400 transition-colors">
                        <Link href={`/portal/projects/${project.id}`} className="focus-visible:outline-none focus-visible:underline">
                          {project.name}
                        </Link>
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {project.description || "Comprehensive CRM and enterprise deliverables implementation."}
                      </p>
                    </div>
                    <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-400 border border-sky-500/20 capitalize shrink-0">
                      {project.status}
                    </span>
                  </div>

                  {/* Visual Multi-Segment Breakdown Progress Bar */}
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                        Overall Progress: {project.progress || breakdown.completedPct}%
                      </span>
                      <span className="text-muted-foreground">
                        {breakdown.completed} of {breakdown.total} deliverables complete
                      </span>
                    </div>

                    {/* The 4-stage breakdown bar */}
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60 flex">
                      {breakdown.completedPct > 0 && (
                        <div
                          style={{ width: `${breakdown.completedPct}%` }}
                          title={`Completed: ${breakdown.completed} (${breakdown.completedPct}%)`}
                          className="bg-emerald-500 transition-all duration-500"
                        />
                      )}
                      {breakdown.reviewPct > 0 && (
                        <div
                          style={{ width: `${breakdown.reviewPct}%` }}
                          title={`In Review: ${breakdown.review} (${breakdown.reviewPct}%)`}
                          className="bg-purple-500 transition-all duration-500"
                        />
                      )}
                      {breakdown.inProgressPct > 0 && (
                        <div
                          style={{ width: `${breakdown.inProgressPct}%` }}
                          title={`In Progress: ${breakdown.in_progress} (${breakdown.inProgressPct}%)`}
                          className="bg-amber-500 transition-all duration-500"
                        />
                      )}
                      {breakdown.todoPct > 0 && (
                        <div
                          style={{ width: `${breakdown.todoPct}%` }}
                          title={`To Do: ${breakdown.todo} (${breakdown.todoPct}%)`}
                          className="bg-slate-400 dark:bg-slate-600 transition-all duration-500"
                        />
                      )}
                    </div>

                    {/* Breakdown Pills: Todo, In Progress, Review, Completed */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1 text-[11px]">
                      <div className="text-center rounded bg-slate-500/10 py-1 text-slate-400 border border-slate-500/20">
                        <span className="font-bold">{breakdown.todo}</span> To Do
                      </div>
                      <div className="text-center rounded bg-amber-500/10 py-1 text-amber-400 border border-amber-500/20">
                        <span className="font-bold">{breakdown.in_progress}</span> In Prog
                      </div>
                      <div className="text-center rounded bg-purple-500/10 py-1 text-purple-400 border border-purple-500/20">
                        <span className="font-bold">{breakdown.review}</span> Review
                      </div>
                      <div className="text-center rounded bg-emerald-500/10 py-1 text-emerald-400 border border-emerald-500/20">
                        <span className="font-bold">{breakdown.completed}</span> Done
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Footer: Dates & Workspace Action */}
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {project.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" aria-hidden="true" /> {project.start_date}
                      </span>
                    )}
                    {project.end_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" /> Due {project.end_date}
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/portal/projects/${project.id}`}
                    className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg bg-sky-500/10 px-3.5 py-1.5 text-xs font-semibold text-sky-400 hover:bg-sky-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 transition-colors"
                  >
                    Workspace <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
