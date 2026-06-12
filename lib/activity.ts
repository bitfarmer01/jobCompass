import { createInsforgeServer } from "@/lib/insforge-server";

// Dashboard recent-activity feed (feature 16): merges the signed-in user's
// completed job searches (agent_runs) and company-research entries (jobs) into
// one time-ordered list. User-scoped (defense in depth on RLS); degrades to an
// empty list on any auth/db failure so the dashboard renders its empty state.

export type ActivityType = "search" | "research";

export type ActivityItem = {
  id: string;
  type: ActivityType;
  text: string;
  timestamp: string; // ISO — used for both ordering and relative display
};

type RunRow = {
  id: string;
  job_title_searched: string | null;
  jobs_found: number | null;
  completed_at: string | null;
  started_at: string;
};

type ResearchRow = {
  id: string;
  company: string | null;
  found_at: string;
  company_research: Record<string, unknown> | null;
};

const FETCH_LIMIT = 10;

function searchText(run: RunRow): string {
  const n = run.jobs_found ?? 0;
  const base = `Found ${n} job${n === 1 ? "" : "s"}`;
  return run.job_title_searched
    ? `${base} for ${run.job_title_searched}`
    : base;
}

export async function getRecentActivity(limit = 6): Promise<ActivityItem[]> {
  try {
    const insforge = await createInsforgeServer();
    const { data: authData, error: authError } =
      await insforge.auth.getCurrentUser();
    const user = authData?.user;
    if (authError || !user) return [];

    const [runsRes, researchRes] = await Promise.all([
      insforge.database
        .from("agent_runs")
        .select("id, job_title_searched, jobs_found, completed_at, started_at")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(FETCH_LIMIT),
      // "company_research IS NOT NULL" is filtered in code, not in the query:
      // the SDK documents only .is(col, null) for null checks, not its inverse.
      // The per-user job set is small, so selecting recent rows and filtering
      // here is safe and stays within documented SDK methods. Ordered/timestamped
      // by found_at — the jobs table has no separate research timestamp column,
      // so "Researched X" entries order by when the job was discovered.
      insforge.database
        .from("jobs")
        .select("id, company, found_at, company_research")
        .eq("user_id", user.id)
        .order("found_at", { ascending: false })
        .limit(200),
    ]);

    if (runsRes.error)
      console.error("[lib/activity] runs query failed:", runsRes.error);
    if (researchRes.error)
      console.error("[lib/activity] research query failed:", researchRes.error);

    const runs = (runsRes.data ?? []) as RunRow[];
    const research = ((researchRes.data ?? []) as ResearchRow[]).filter(
      (job) => job.company_research != null,
    );

    const items: ActivityItem[] = [
      ...runs.map((run) => ({
        id: `run-${run.id}`,
        type: "search" as const,
        text: searchText(run),
        timestamp: run.completed_at ?? run.started_at,
      })),
      ...research.map((job) => ({
        id: `research-${job.id}`,
        type: "research" as const,
        text: `Researched ${job.company ?? "a company"}`,
        timestamp: job.found_at,
      })),
    ];

    return items
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  } catch (error) {
    console.error("[lib/activity] getRecentActivity threw:", error);
    return [];
  }
}
