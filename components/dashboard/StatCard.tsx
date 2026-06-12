import { TrendingUp } from "@/components/icons";
import type { IconProps } from "@/components/icons";

export type Stat = {
  label: string;
  value: string;
  // Omitted on real data — there's no honest week-over-week basis yet.
  trend?: string;
  icon: (props: IconProps) => React.ReactElement;
};

// Single dashboard stat card: label + icon, big stat number, optional trend badge.
export function StatCard({ label, value, trend, icon: Icon }: Stat) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col gap-4 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-accent" />
        </div>
      </div>

      <p className="text-3xl font-semibold text-text-primary leading-9">
        {value}
      </p>

      {trend && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-success-lightest text-success-darker text-xs font-medium">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
          <span className="text-xs text-text-muted">vs last week</span>
        </div>
      )}
    </div>
  );
}
