import { NextResponse } from "next/server";

import { researchCompany } from "@/agent/researcher";
import { logAgent } from "@/lib/agent-logs";
import { createInsforgeServer } from "@/lib/insforge-server";
import { getJobById } from "@/lib/jobs";
import { createPostHogServer } from "@/lib/posthog-server";
import type { Profile } from "@/types";

// Analytics must never decide the response — capture failures are logged and
// swallowed so a PostHog outage can't fail a research run that succeeded.
async function captureResearchEvent(
  userId: string,
  jobId: string,
  company: string | null,
) {
  try {
    const posthog = createPostHogServer();
    posthog.capture({
      distinctId: userId,
      event: "company_researched",
      properties: { userId, jobId, company },
    });
    await posthog.shutdown();
  } catch (err) {
    console.error("[api/agent/research] posthog:", err);
  }
}

// NOTE: no maxDuration / timeout config here (library-docs Browserbase rule) —
// the route simply awaits the research pipeline (typically 1–3 minutes).
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
    const jobId = typeof body?.jobId === "string" ? body.jobId.trim() : "";

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "Missing job id." },
        { status: 422 },
      );
    }

    // getJobById is user-scoped — a job that isn't the caller's is a 404.
    const job = await getJobById(jobId);
    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found." },
        { status: 404 },
      );
    }

    const { data: profile, error: profileError } = await insforge.database
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          success: false,
          error: "Profile not found. Please complete your profile first.",
        },
        { status: 422 },
      );
    }

    const result = await researchCompany(job, profile as Profile, user.id);
    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error ?? "Research failed." },
        { status: 500 },
      );
    }

    const { error: saveError } = await insforge.database
      .from("jobs")
      .update({ company_research: result.data })
      .eq("id", job.id)
      .eq("user_id", user.id); // always scope to user (defense in depth on RLS)

    if (saveError) {
      console.error("[api/agent/research] dossier save failed:", saveError);
      return NextResponse.json(
        {
          success: false,
          error: "Research finished but could not be saved. Please try again.",
        },
        { status: 500 },
      );
    }

    // Fire-and-forget side effects — never block or fail the response.
    void logAgent({
      runId: job.run_id,
      userId: user.id,
      jobId: job.id,
      level: "success",
      message: `Researched ${job.company ?? "company"} — dossier saved`,
    });
    void captureResearchEvent(user.id, job.id, job.company);

    return NextResponse.json({ success: true, research: result.data });
  } catch (error) {
    console.error("[api/agent/research]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
