import { getUserJobs } from "@/lib/jobs";
import type { Job } from "@/types";

// Server-side chart data for /dashboard, computed from the signed-in user's jobs
// (feature 17). Reuses getUserJobs() — the same source as the stat cards — and
// groups/buckets in code (the "compute in code, small per-user sets" pattern from
// lib/dashboard-stats.ts). No external calls: the data already lives in the DB.
//
// Note: jobs has no researched_at column, so "Company Research Activity" is keyed
// by found_at (job-discovery day) for researched jobs — the accepted feature-16
// tradeoff. Each series returns [] when it has no data in-window → the chart shows
// its empty state. getChartData never throws (getUserJobs already degrades to []).

export type ChartData = {
  jobsOverTime: { day: string; jobs: number }[]; // last 30 days, [] if none in-window
  companyResearch: { day: string; count: number }[]; // last 7 days, [] if none in-window
  matchDistribution: { range: string; count: number }[]; // 5 buckets, [] if no scores
};

const MATCH_RANGES = ["50-60", "60-70", "70-80", "80-90", "90-100"] as const;

// --- date helpers (local time) ---

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// The last `n` calendar days as YYYY-MM-DD, oldest first, ending today.
function lastNDates(n: number): string[] {
  const today = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(isoDate(d));
  }
  return out;
}

function labelFromIso(iso: string, kind: "monthDay" | "weekday"): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(
    "en-US",
    kind === "weekday"
      ? { weekday: "short" }
      : { month: "short", day: "numeric" },
  );
}

function bucketFor(score: number): (typeof MATCH_RANGES)[number] | null {
  if (score >= 90) return "90-100";
  if (score >= 80) return "80-90";
  if (score >= 70) return "70-80";
  if (score >= 60) return "60-70";
  if (score >= 50) return "50-60";
  return null;
}

// Count jobs by their found_at calendar day, then lay them onto a continuous,
// zero-filled axis of the last `days` days (oldest first).
function dailySeries(
  jobs: Job[],
  days: number,
): { iso: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const j of jobs) {
    if (!j.found_at) continue;
    const d = new Date(j.found_at);
    if (Number.isNaN(d.getTime())) continue;
    const iso = isoDate(d);
    counts.set(iso, (counts.get(iso) ?? 0) + 1);
  }
  return lastNDates(days).map((iso) => ({ iso, count: counts.get(iso) ?? 0 }));
}

export async function getChartData(): Promise<ChartData> {
  const empty: ChartData = {
    jobsOverTime: [],
    companyResearch: [],
    matchDistribution: [],
  };

  try {
    const jobs = await getUserJobs(); // [] on auth/db failure

    // Jobs Found Over Time — all jobs, last 30 days by found_at.
    const jobsSeries = dailySeries(jobs, 30);
    const jobsTotal = jobsSeries.reduce((s, p) => s + p.count, 0);
    const jobsOverTime =
      jobsTotal === 0
        ? []
        : jobsSeries.map((p) => ({
            day: labelFromIso(p.iso, "monthDay"),
            jobs: p.count,
          }));

    // Company Research Activity — researched jobs only, last 7 days by found_at.
    const researched = jobs.filter((j) => j.company_research != null);
    const researchSeries = dailySeries(researched, 7);
    const researchTotal = researchSeries.reduce((s, p) => s + p.count, 0);
    const companyResearch =
      researchTotal === 0
        ? []
        : researchSeries.map((p) => ({
            day: labelFromIso(p.iso, "weekday"),
            count: p.count,
          }));

    // Match Score Distribution — all scored jobs bucketed 50-60…90-100 (all-time).
    const tally = new Map<string, number>(MATCH_RANGES.map((r) => [r, 0]));
    for (const j of jobs) {
      if (typeof j.match_score !== "number") continue;
      const b = bucketFor(j.match_score);
      if (b) tally.set(b, (tally.get(b) ?? 0) + 1);
    }
    const buckets = MATCH_RANGES.map((range) => ({
      range,
      count: tally.get(range) ?? 0,
    }));
    const matchDistribution = buckets.every((b) => b.count === 0) ? [] : buckets;

    return { jobsOverTime, companyResearch, matchDistribution };
  } catch (error) {
    console.error("[lib/chart-data] getChartData threw:", error);
    return empty;
  }
}
