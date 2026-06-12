import { Briefcase, Building2, Calendar, Target } from "@/components/icons";
import { StatCard, type Stat } from "@/components/dashboard/StatCard";
import type { DashboardStats } from "@/lib/dashboard-stats";

// Real stat values (feature 15) come from getDashboardStats(); labels + icons
// live here. Trends are intentionally omitted — no honest historical basis yet.
export function StatsGrid({ stats }: { stats: DashboardStats }) {
  const cards: Stat[] = [
    {
      label: "Total Jobs Found",
      value: String(stats.totalJobs),
      icon: Briefcase,
    },
    {
      label: "Avg. Match Rate",
      value: `${stats.avgMatchRate}%`,
      icon: Target,
    },
    {
      label: "Companies Researched",
      value: String(stats.companiesResearched),
      icon: Building2,
    },
    {
      label: "Jobs This Week",
      value: String(stats.jobsThisWeek),
      icon: Calendar,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
