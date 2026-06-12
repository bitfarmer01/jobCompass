import { CompanyResearchChart } from "@/components/dashboard/CompanyResearchChart";
import { IncompleteProfileBanner } from "@/components/dashboard/IncompleteProfileBanner";
import { JobsOverTimeChart } from "@/components/dashboard/JobsOverTimeChart";
import { MatchDistributionChart } from "@/components/dashboard/MatchDistributionChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { getRecentActivity } from "@/lib/activity";
import { getChartData } from "@/lib/chart-data";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { getProfileStatus } from "@/lib/profile";

// Banner, stat cards, recent activity, and the three charts are all real data.
// The charts read PostHog events for the signed-in user (feature 17); each shows
// an empty state until events exist (or until the PostHog read key is configured).
export default async function DashboardPage() {
  const [{ isComplete, percentage, missingFields }, stats, activity, charts] =
    await Promise.all([
      getProfileStatus(),
      getDashboardStats(),
      getRecentActivity(),
      getChartData(),
    ]);

  return (
    <div className="w-full max-w-[1440px] mx-auto px-8 py-8 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary">
          Your job search at a glance.
        </p>
      </div>

      {!isComplete && (
        <IncompleteProfileBanner
          percentage={percentage}
          missingFields={missingFields}
        />
      )}

      <StatsGrid stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <JobsOverTimeChart data={charts.jobsOverTime} />
        <RecentActivity items={activity} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompanyResearchChart data={charts.companyResearch} />
        <MatchDistributionChart data={charts.matchDistribution} />
      </div>
    </div>
  );
}
