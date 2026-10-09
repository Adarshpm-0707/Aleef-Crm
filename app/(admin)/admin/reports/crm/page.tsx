/**
 * app/(admin)/admin/reports/crm/page.tsx
 *
 * CRM Analytics & Financial Reports:
 * - Total pipeline value, win rate, deal velocity
 * - Recharts area chart of deals won & pipeline over time
 * - Filter by Date From/To, Client, Pipeline Stage
 * - ExportButton (CSV, Excel, PDF)
 */

"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  leadsApi,
  clientsApi,
  type Lead,
  type Client,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type ColumnDef } from "@/components/shared/DataTable";
import { ExportButton } from "@/components/shared/ExportButton";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { toast } from "sonner";

export default function CrmReportPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-12-31");
  const [clientFilter, setClientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [lList, cList] = await Promise.all([leadsApi.getAll(), clientsApi.getAll()]);
      setLeads(lList);
      setClients(cList);
    } catch {
      toast.error("Failed to load CRM reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (clientFilter && l.client_id !== clientFilter) return false;
      if (statusFilter && l.status !== statusFilter) return false;
      if (dateFrom && l.created_at.slice(0, 10) < dateFrom) return false;
      if (dateTo && l.created_at.slice(0, 10) > dateTo) return false;
      return true;
    });
  }, [leads, clientFilter, statusFilter, dateFrom, dateTo]);

  const totalValue = filteredLeads.reduce((acc, l) => acc + (l.lead_value || 0), 0);
  const wonDeals = filteredLeads.filter((l) => l.status === "won");
  const wonValue = wonDeals.reduce((acc, l) => acc + (l.lead_value || 0), 0);
  const winRate = filteredLeads.length > 0 ? Math.round((wonDeals.length / filteredLeads.length) * 100) : 0;

  // Chart data by stage
  const stageChartData = useMemo(() => {
    const counts: Record<string, { count: number; value: number }> = {};
    filteredLeads.forEach((l) => {
      const s = l.status;
      if (!counts[s]) counts[s] = { count: 0, value: 0 };
      counts[s].count += 1;
      counts[s].value += l.lead_value || 0;
    });
    return Object.keys(counts).map((k) => ({
      stage: k.replace("_", " ").toUpperCase(),
      count: counts[k].count,
      value: counts[k].value,
    }));
  }, [filteredLeads]);

  const exportColumns = [
    { key: "title", header: "Opportunity" },
    { key: "client", header: "Client" },
    { key: "contact_name", header: "Contact" },
    { key: "lead_value", header: "Value (₹)" },
    { key: "status", header: "Stage" },
    { key: "owner", header: "Account Rep" },
    { key: "created_at", header: "Created Date" },
  ];

  const exportData = useMemo(() => {
    return filteredLeads.map((l) => ({
      title: l.title,
      client: l.client?.company_name || "New Prospect",
      contact_name: l.contact_name,
      lead_value: l.lead_value || 0,
      status: l.status,
      owner: l.owner?.full_name || "Unassigned",
      created_at: l.created_at.slice(0, 10),
    }));
  }, [filteredLeads]);

  const columns: ColumnDef<Lead>[] = [
    {
      key: "title",
      header: "Opportunity / Client",
      sortable: true,
      cell: (row) => (
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground text-sm">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.client?.company_name || "Unlinked Prospect"}</p>
        </div>
      ),
    },
    {
      key: "contact_name",
      header: "Lead Contact",
      sortable: true,
      cell: (row) => <span className="text-xs text-foreground font-medium">{row.contact_name}</span>,
    },
    {
      key: "lead_value",
      header: "Deal Value (₹)",
      sortable: true,
      cell: (row) => (
        <span className="font-bold text-teal-600">
          ₹ {(row.lead_value || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Pipeline Stage",
      sortable: true,
      cell: (row) => (
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold capitalize">
          {row.status.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "owner",
      header: "Account Executive",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{row.owner?.full_name || "Unassigned"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM Revenue & Pipeline Report"
        description="Comprehensive analytics on deal acquisition, conversion velocity, and pipeline forecasting."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Reports", href: "/admin/reports/crm" },
          { label: "CRM Analytics" },
        ]}
        actions={
          <ExportButton filename="crm_revenue_report" columns={exportColumns} data={exportData} />
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Pipeline Value</span>
          <p className="mt-1 text-2xl font-bold text-foreground">₹ {totalValue.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Won Deals Revenue</span>
          <p className="mt-1 text-2xl font-bold text-emerald-600">₹ {wonValue.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Opportunities Logged</span>
          <p className="mt-1 text-2xl font-bold text-foreground">{filteredLeads.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">Win Rate</span>
          <p className="mt-1 text-2xl font-bold text-teal-600">{winRate}%</p>
        </div>
      </div>

      {/* Filters Strip */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <label htmlFor="crm-date-from" className="text-xs font-medium text-muted-foreground">From:</label>
          <input
            id="crm-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="min-h-[44px] sm:min-h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <label htmlFor="crm-date-to" className="text-xs font-medium text-muted-foreground">To:</label>
          <input
            id="crm-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="min-h-[44px] sm:min-h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <label htmlFor="crm-client-filter" className="text-xs font-medium text-muted-foreground">Client:</label>
          <select
            id="crm-client-filter"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="min-h-[44px] sm:min-h-8 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <label htmlFor="crm-status-filter" className="text-xs font-medium text-muted-foreground">Stage:</label>
          <select
            id="crm-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-[44px] sm:min-h-8 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Stages</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="proposal_sent">Proposal Sent</option>
            <option value="negotiation">Negotiation</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Visual Chart */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm" aria-label="Pipeline Distribution Chart">
        <h2 className="text-base font-semibold text-foreground mb-4">Pipeline Distribution by Stage (₹)</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stageChartData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar dataKey="value" name="Stage Value (₹)" fill="#0d9488" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed DataTable with skeleton */}
      <DataTable
        columns={columns}
        data={filteredLeads}
        loading={loading}
        emptyTitle="No records matching filter criteria"
      />
    </div>
  );
}
