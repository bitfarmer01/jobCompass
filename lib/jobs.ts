import { createInsforgeServer } from "@/lib/insforge-server";
import type { Job } from "@/types";

// Server-side read of the signed-in user's discovered jobs for the Find Jobs
// table. Scoped by user_id (defense in depth on top of RLS, per the
// always-filter-by-user invariant) and ordered newest-first. Any failure
// degrades to an empty list so the page renders its empty state rather than
// crashing — matches the resilient read pattern in lib/auth.ts.
export async function getUserJobs(): Promise<Job[]> {
  try {
    const insforge = await createInsforgeServer();
    const { data: authData, error: authError } =
      await insforge.auth.getCurrentUser();
    const user = authData?.user;
    if (authError || !user) return [];

    const { data, error } = await insforge.database
      .from("jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("found_at", { ascending: false });

    if (error || !data) {
      if (error) console.error("[lib/jobs] getUserJobs failed:", error);
      return [];
    }
    return data as Job[];
  } catch (error) {
    console.error("[lib/jobs] getUserJobs threw:", error);
    return [];
  }
}

// Server-side read of a single job by id for the Job Details page. Scoped by
// user_id so one user can never open another user's job (defense in depth on
// top of RLS). Returns null on auth failure, query error, or no match — the
// page turns that into a notFound(). Filtering on the primary key returns at
// most one row, so we take the first record rather than relying on .single().
export async function getJobById(id: string): Promise<Job | null> {
  try {
    const insforge = await createInsforgeServer();
    const { data: authData, error: authError } =
      await insforge.auth.getCurrentUser();
    const user = authData?.user;
    if (authError || !user) return null;

    const { data, error } = await insforge.database
      .from("jobs")
      .select("*")
      .eq("user_id", user.id)
      .eq("id", id);

    if (error || !data || data.length === 0) {
      if (error) console.error("[lib/jobs] getJobById failed:", error);
      return null;
    }
    return data[0] as Job;
  } catch (error) {
    console.error("[lib/jobs] getJobById threw:", error);
    return null;
  }
}
