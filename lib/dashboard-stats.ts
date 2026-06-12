import { getUserJobs } from "@/lib/jobs";

// Real dashboard stat values for the signed-in user (feature 15). Computed in
// code from the user's jobs rather than via SQL aggregates — the row set is
// small (per-user job history) and getUserJobs is already the user-scoped,
// failure-degrading read for this data, so reusing it keeps one source of truth.

export type DashboardStats = {
  totalJobs: number;
  avgMatchRate: number; // whole percent, 0 when no scored jobs
  companiesResearched: number;
  jobsThisWeek: number;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function getDashboardStats(): Promise<DashboardStats> {
  const jobs = await getUserJobs();

  const scored = jobs
    .map((j) => j.match_score)
    .filter((s): s is number => typeof s === "number");

  const avgMatchRate =
    scored.length > 0
      ? Math.round(scored.reduce((sum, s) => sum + s, 0) / scored.length)
      : 0;

  const cutoff = Date.now() - WEEK_MS;
  const jobsThisWeek = jobs.filter((j) => {
    const found = new Date(j.found_at).getTime();
    return !Number.isNaN(found) && found >= cutoff;
  }).length;

  return {
    totalJobs: jobs.length,
    avgMatchRate,
    companiesResearched: jobs.filter((j) => j.company_research != null).length,
    jobsThisWeek,
  };
}
