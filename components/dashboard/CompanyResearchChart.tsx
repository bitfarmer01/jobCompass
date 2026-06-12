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
// ui-tokens.md "Dashboard Chart Colors". Company Research Activity bars = #61A8FF.
const INFO = "#61a8ff";
const GRID = "#e7eaf3";
const AXIS = "#9ca3af";

// Last 7 days of the user's researched jobs by found_at (feature 17). Empty
// array → none in window → ChartCard renders its empty state.
export function CompanyResearchChart({
  data,
}: {
  data: { day: string; count: number }[];
}) {
  return (
    <ChartCard
      title="Company Research Activity"
      isEmpty={data.length === 0}
      emptyLabel="No companies researched yet — research one to see this."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke={GRID} vertical={false} />
          <XAxis
            dataKey="day"
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
            cursor={{ fill: "rgba(97,168,255,0.08)" }}
            contentStyle={{
              borderRadius: 8,
              border: `1px solid ${GRID}`,
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="count"
            name="Researched"
            fill={INFO}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
