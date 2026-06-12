"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/dashboard/ChartCard";

// Hex literals are the sanctioned exception here (same as lib/resume-pdf.tsx):
// recharts props can't read CSS @theme tokens. Values come straight from
// ui-tokens.md "Dashboard Chart Colors".
const ACCENT = "#7c5cfc";
const GRID = "#e7eaf3";
const AXIS = "#9ca3af";

// Last 30 days of the user's discovered jobs by found_at (feature 17). Empty
// array → none in window → ChartCard renders its empty state.
export function JobsOverTimeChart({
  data,
}: {
  data: { day: string; jobs: number }[];
}) {
  return (
    <ChartCard
      title="Jobs Found Over Time"
      isEmpty={data.length === 0}
      emptyLabel="No jobs found yet — run a search to see this."
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="jobsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.2} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke={GRID} vertical={false} />
          <XAxis
            dataKey="day"
            interval="preserveStartEnd"
            minTickGap={24}
            tick={{ fontSize: 12, fill: AXIS }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: AXIS }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={32}
          />
          <Tooltip
            cursor={{ stroke: GRID }}
            contentStyle={{
              borderRadius: 8,
              border: `1px solid ${GRID}`,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="jobs"
            name="Jobs"
            stroke={ACCENT}
            strokeWidth={3}
            fill="url(#jobsFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
