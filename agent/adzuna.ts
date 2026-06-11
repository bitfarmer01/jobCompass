import { detectCountry, searchJobs, CURRENCY_SYMBOL, type AdzunaJob } from "@/lib/adzuna";
import { scoreJob } from "@/agent/matcher";
import { logAgent } from "@/lib/agent-logs";
import type { JobInsert, JobScore, Profile } from "@/types";

// Maps Adzuna contract_type/contract_time to the domain vocabulary used throughout the app.
function mapJobType(contractType?: string, contractTime?: string): string {
  if (contractType === "contract") return "contract";
  if (contractTime === "part_time") return "parttime";
  return "fulltime";
}

// Maps one scored Adzuna result to a `jobs` row (see context/library-docs.md →
// Adzuna API → Saving Jobs to DB). The snippet becomes about_role; the bullet
// arrays stay empty — Adzuna search results carry no structured sections.
function toJobRecord(
  job: AdzunaJob,
  score: JobScore,
  userId: string,
  runId: string,
  currencySymbol: string,
): JobInsert {
  const salaryMin = job.salary_min;
  const salaryMax = job.salary_max ?? salaryMin;
  return {
    run_id: runId,
    user_id: userId,
    source: "search",
    source_url: job.redirect_url,
    external_apply_url: job.redirect_url,
    title: job.title,
    company: job.company.display_name,
    location: job.location.display_name,
    salary:
      salaryMin !== undefined && salaryMin !== null
        ? `${currencySymbol}${Math.round(salaryMin / 1000)}k - ${currencySymbol}${Math.round((salaryMax ?? salaryMin) / 1000)}k`
        : null,
    job_type: mapJobType(job.contract_type, job.contract_time),
    about_role: job.description,
    responsibilities: [],
    requirements: [],
    nice_to_have: [],
    benefits: [],
    about_company: null,
    match_score: score.matchScore,
    match_reason: score.matchReason,
    matched_skills: score.matchedSkills,
    missing_skills: score.missingSkills,
    found_at: new Date().toISOString(),
  };
}

// Searches Adzuna and scores every result against the profile concurrently.
// A job whose scoring call fails is skipped (logged to agent_logs) rather than
// saved — a row without match data would break the score-bar UI. totalFound
// counts what Adzuna returned; records.length is what actually gets saved.
export async function discoverJobs(
  jobTitle: string,
  location: string,
  profile: Profile,
  userId: string,
  runId: string,
): Promise<{
  success: boolean;
  data?: { records: JobInsert[]; totalFound: number };
  error?: string;
}> {
  try {
    const country = detectCountry(location);
    const currencySymbol = CURRENCY_SYMBOL[country];
    const jobs = await searchJobs(jobTitle, location, country);

    const scored = await Promise.allSettled(
      jobs.map(async (job) => {
        const result = await scoreJob(job, profile, jobTitle);
        if (!result.success || !result.data) {
          throw new Error(result.error ?? "scoring failed");
        }
        return toJobRecord(job, result.data, userId, runId, currencySymbol);
      }),
    );

    const records: JobInsert[] = [];
    for (let i = 0; i < scored.length; i++) {
      const outcome = scored[i];
      if (outcome.status === "fulfilled") {
        records.push(outcome.value);
      } else {
        console.error(
          `[agent/adzuna] skipped "${jobs[i]?.title}" — ${outcome.reason}`,
        );
        // best-effort — don't await, skip failures must never slow down the successful path
        void logAgent({
          runId,
          userId,
          level: "warning",
          message: `Skipped "${jobs[i]?.title ?? "a job"}" — match scoring failed`,
        });
      }
    }

    // All jobs returned by Adzuna failed scoring — distinguish from a genuinely empty search.
    if (jobs.length > 0 && records.length === 0) {
      await logAgent({
        runId,
        userId,
        level: "error",
        message: `Job scoring failed for all ${jobs.length} results — no jobs saved`,
      });
      return {
        success: false,
        error: "Job scoring failed. Please try again in a moment.",
      };
    }

    return { success: true, data: { records, totalFound: jobs.length } };
  } catch (error) {
    // Log the raw error server-side; never surface provider internals to the user.
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[agent/adzuna]", msg);
    await logAgent({
      runId,
      userId,
      level: "error",
      message: `Job discovery failed for "${jobTitle}"`,
    });
    return { success: false, error: "Job search failed. Please try again." };
  }
}
