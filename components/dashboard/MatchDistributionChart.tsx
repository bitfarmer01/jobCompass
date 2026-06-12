"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/dashboard/ChartCard";

// Sanctioned hex exception (recharts can't read @theme tokens) — see
// ui-tokens.md "Dashboard Chart Colors". Match Score Distribution bars = #10B981.
const SUCCESS = "#10b981";
const GRID = "#e7eaf3";
const AXIS = "#9ca3af";

// match_score buckets of the user's jobs (feature 17). Empty array → no scored
// jobs yet → ChartCard renders its empty state.
export function MatchDistributionChart({
  data,
}: {
  data: { range: string; count: number }[];
}) {
  return (
    <ChartCard
      title="Match Score Distribution"
      isEmpty={data.length === 0}
      emptyLabel="No match data yet — run a search to see this."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke={GRID} vertical={false} />
          <XAxis
            dataKey="range"
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
            cursor={{ fill: "rgba(16,185,129,0.08)" }}
            contentStyle={{
              borderRadius: 8,
              border: `1px solid ${GRID}`,
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" name="Jobs" fill={SUCCESS} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
