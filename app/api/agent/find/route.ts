import { NextResponse } from "next/server";

import { discoverJobs } from "@/agent/adzuna";
import { logAgent } from "@/lib/agent-logs";
import { createInsforgeServer } from "@/lib/insforge-server";
import { createPostHogServer } from "@/lib/posthog-server";
import { MATCH_THRESHOLD } from "@/lib/utils";
import type { Profile } from "@/types";

type InsforgeServer = Awaited<ReturnType<typeof createInsforgeServer>>;

// Marks a run failed so it never sits in 'running' forever. user_id filter is
// defense in depth on top of RLS (per architecture.md invariants).
async function markRunFailed(
  insforge: InsforgeServer,
  runId: string,
  userId: string,
) {
  const { error } = await insforge.database
    .from("agent_runs")
    .update({ status: "failed", completed_at: new Date().toISOString() })
    .eq("id", runId)
    .eq("user_id", userId);
  if (error) {
    console.error("[api/agent/find] failed-status update failed:", error);
  }
}

// Analytics must never decide the response — capture failures are logged and
// swallowed so a PostHog outage can't fail a search that succeeded.
async function captureSearchEvents(
  userId: string,
  runId: string,
  jobTitle: string,
  location: string,
  savedScores: number[],
) {
  try {
    const posthog = createPostHogServer();
    posthog.capture({
      distinctId: userId,
      event: "job_search_started",
      properties: { userId, runId, jobTitle, location },
    });
    // Event shape per context/project-overview.md → PostHog Events
    for (const matchScore of savedScores) {
      posthog.capture({
        distinctId: userId,
        event: "job_found",
        properties: { userId, runId, source: "search", matchScore },
      });
    }
    await posthog.shutdown();
  } catch (err) {
    console.error("[api/agent/find] posthog:", err);
  }
}

export async function POST(request: Request) {
  try {
    const insforge = await createInsforgeServer();
    const { data: authData, error: authError } =
      await insforge.auth.getCurrentUser();
    const user = authData?.user;

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    const jobTitle = typeof body?.jobTitle === "string" ? body.jobTitle.trim() : "";
    const location = typeof body?.location === "string" ? body.location.trim() : "";

    if (!jobTitle) {
      return NextResponse.json(
        { success: false, error: "Please enter a job title to search." },
        { status: 422 },
      );
    }

    const { data: profile, error: profileError } = await insforge.database
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found. Please complete your profile first." },
        { status: 422 },
      );
    }

    const { data: run, error: runError } = await insforge.database
      .from("agent_runs")
      .insert([
        {
          user_id: user.id,
          status: "running",
          job_title_searched: jobTitle,
          location_searched: location || null,
          started_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (runError || !run) {
      console.error("[api/agent/find] agent_run insert failed:", runError);
      return NextResponse.json(
        { success: false, error: "Could not start the job search. Please try again." },
        { status: 500 },
      );
    }

    const result = await discoverJobs(
      jobTitle,
      location,
      profile as Profile,
      user.id,
      run.id,
    );

    if (!result.success || !result.data) {
      // discoverJobs already logged the failure to agent_logs.
      await markRunFailed(insforge, run.id, user.id);
      return NextResponse.json(
        { success: false, error: result.error ?? "Job search failed. Please try again." },
        { status: 500 },
      );
    }

    const { records, totalFound } = result.data;

    try {
      if (records.length > 0) {
        const { error: insertError } = await insforge.database
          .from("jobs")
          .insert(records);
        if (insertError) {
          throw new Error(`jobs insert failed: ${insertError.message}`);
        }
      }

      const { error: updateError } = await insforge.database
        .from("agent_runs")
        .update({
          status: "completed",
          jobs_found: records.length,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id)
        .eq("user_id", user.id);

      if (updateError) {
        // Jobs are saved — log the bookkeeping miss but don't fail the search.
        console.error("[api/agent/find] agent_run update failed:", updateError);
      }

      const strongMatches = records.filter(
        (r) => (r.match_score ?? 0) >= MATCH_THRESHOLD,
      ).length;

      // Fire side-effects without awaiting — logging and analytics must never
      // add latency to the response. Both helpers swallow their own errors.
      void logAgent({
        runId: run.id,
        userId: user.id,
        level: "success",
        message: `Found ${records.length} jobs for "${jobTitle}" — ${strongMatches} strong matches`,
      });

      void captureSearchEvents(
        user.id,
        run.id,
        jobTitle,
        location,
        records.map((r) => r.match_score ?? 0),
      );

      return NextResponse.json({
        success: true,
        jobsFound: records.length,
        totalFound,
        strongMatches,
      });
    } catch (error) {
      // Persistence failed mid-run — record it and surface a generic error.
      console.error("[api/agent/find] run failed:", error);
      await logAgent({
        runId: run.id,
        userId: user.id,
        level: "error",
        message: `Job search failed while saving results for "${jobTitle}"`,
      });
      await markRunFailed(insforge, run.id, user.id);
      return NextResponse.json(
        { success: false, error: "Job search failed. Please try again." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[api/agent/find]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
