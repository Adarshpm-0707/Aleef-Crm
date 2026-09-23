/**
 * LineChart — responsive recharts line chart with tooltip, legend, gradient fill.
 */

"use client";

import React from "react";
import {
  LineChart as RechartsLine,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

/* ─── Types ────────────────────────────────────────────────────────────────── */

export interface LineChartSeries {
  key: string;
  label: string;
  color: string;
}

export interface LineChartProps {
  data: Record<string, unknown>[];
  series: LineChartSeries[];
  xKey: string;
  height?: number;
  yAxisLabel?: string;
  title?: string;
  className?: string;
  /** Format Y-axis tick values */
  yTickFormatter?: (v: number) => string;
  /** Format tooltip values */
  tooltipFormatter?: (v: number, name: string) => [string, string];
}

/* ─── Custom Tooltip ────────────────────────────────────────────────────────── */

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey?: string | number;
    name?: string;
    value?: number | string;
    color?: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-4 py-3 shadow-lg">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={String(entry.dataKey || entry.name)} className="flex items-center gap-2 text-sm">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export function LineChart({
  data,
  series,
  xKey,
  height = 300,
  title,
  className,
  yTickFormatter,
  tooltipFormatter,
}: LineChartProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 shadow-card", className)}>
      {title && <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>}

      <ResponsiveContainer width="100%" height={height}>
        <RechartsLine
          data={data}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`line-gradient-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={yTickFormatter}
            width={40}
          />
          <Tooltip
            content={<CustomTooltip />}
            formatter={tooltipFormatter as never}
            cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1.5 }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }}
          />

          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2.5}
              dot={{ fill: s.color, strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))" }}
            />
          ))}
        </RechartsLine>
      </ResponsiveContainer>
    </div>
  );
}
