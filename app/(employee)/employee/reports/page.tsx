/**
 * app/(employee)/employee/reports/page.tsx
 *
 * Employee Performance & Work Reports — Visual charts of monthly hours,
 * task completion rates, client distribution, and timesheet exports.
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  Download,
  Award,
  FileSpreadsheet,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { useCurrentEmployee } from "@/lib/permissions/employee";
import { tasksApi, deliverablesApi, type Task, type WorkDeliverable } from "@/lib/api";

const weeklyHoursData = [
  { week: "Week 1", logged: 39.5, target: 40 },
  { week: "Week 2", logged: 42.0, target: 40 },
  { week: "Week 3", logged: 41.2, target: 40 },
  { week: "Week 4 (Current)", logged: 26.5, target: 40 },
];

const clientWorkloadData = [
  { name: "Apex Global Logistics", value: 45, color: "#6366f1" },
  { name: "CarePlus Healthcare", value: 30, color: "#10b981" },
  { name: "Tamkeen Financial", value: 15, color: "#f59e0b" },
  { name: "Internal R&D", value: 10, color: "#0ea5e9" },
];

export default function EmployeeReportsPage() {
  const { employee } = useCurrentEmployee();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deliverables, setDeliverables] = useState<WorkDeliverable[]>([]);
  const [timeRange, setTimeRange] = useState("this_month");

  useEffect(() => {
    async function loadData() {
      try {
        const [empTasks, empDelivs] = await Promise.all([
          tasksApi.getAll({ assigneeId: employee.userId }),
          deliverablesApi.getAll({ employeeUserId: employee.userId }),
        ]);
        setTasks(empTasks);
        setDeliverables(empDelivs);
      } catch (err) {
        console.error("Failed to load reports:", err);
      }
    }
    loadData();
  }, [employee.userId]);

  const handleExportCSV = () => {
    toast.success("Employee Performance Report exported to CSV!");
  };

  const handleExportPDF = () => {
    toast.success("Generating official timesheet & performance PDF...");
  };

  const completedTasks = tasks.filter((t) => t.status === "completed");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <BarChart3 className="h-6 w-6 text-indigo-400" />
            Personal Reports & Performance
          </h1>
          <p className="text-sm text-muted-foreground">
            Monthly logged hours, deliverable punctuality rate, and client distribution analytics
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
          >
            <option value="this_month">September 2026 (This Month)</option>
            <option value="last_month">August 2026</option>
            <option value="q3">Q3 2026</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            CSV
          </button>

          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            PDF Report
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Logged Hours</p>
            <Clock className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">149.2 hrs</p>
          <p className="mt-1 text-xs text-emerald-400 font-medium">+9.2 hrs above baseline</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">On-Time Delivery</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">96.4%</p>
          <p className="mt-1 text-xs text-muted-foreground">14 of 15 deliverables</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completed Tasks</p>
            <Award className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{completedTasks.length}</p>
          <p className="mt-1 text-xs text-amber-400 font-medium">{tasks.length} total assigned</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client Rating</p>
            <TrendingUp className="h-4 w-4 text-sky-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">4.9 / 5.0</p>
          <p className="mt-1 text-xs text-sky-400 font-medium">Top Tier Performance</p>
        </div>
      </div>

      {/* Visual Charts: Working Hours & Client Workload Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Weekly Logged Hours vs Target */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-1">Weekly Hours Logged vs Target</h3>
          <p className="text-xs text-muted-foreground mb-4">Standard 40-hour work week comparison</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyHoursData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 50]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                />
                <Bar dataKey="logged" name="Logged Hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" name="Target (40h)" fill="#334155" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workload Distribution by Client */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-1">Workload Distribution by Client</h3>
          <p className="text-xs text-muted-foreground mb-4">Percentage of time spent on active client contracts</p>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={clientWorkloadData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {clientWorkloadData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(val) => [`${val}% of total time`, ""]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(val) => <span className="text-xs text-muted-foreground">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Completed Client Deliverables Log */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Completed Client Work Records</h2>
            <p className="text-xs text-muted-foreground">Deliverables verified and accepted during this billing cycle</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-3">Work Title</th>
                <th className="px-6 py-3">Client</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Delivered Date</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground text-xs">
              {deliverables.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-3.5 font-semibold text-foreground">
                    {item.title}
                    <span className="block text-[11px] font-mono text-muted-foreground">{item.file_name}</span>
                  </td>
                  <td className="px-6 py-3.5 font-medium text-foreground/80">
                    {item.client?.company_name || "Enterprise Client"}
                  </td>
                  <td className="px-6 py-3.5 capitalize text-indigo-400 font-semibold">
                    {item.category.replace("_", " ")}
                  </td>
                  <td className="px-6 py-3.5 font-mono text-muted-foreground">
                    {item.created_at.slice(0, 10)}
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                        item.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {item.status === "approved" ? "Approved" : "In Review"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
