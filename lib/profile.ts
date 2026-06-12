import { getCurrentUser } from "@/lib/auth";
import { createInsforgeServer } from "@/lib/insforge-server";
import {
  type CompletionInput,
  getProfileCompletion,
} from "@/lib/profile-completion";

// Server-side read of the signed-in user's profile completeness. Powers the
// dashboard incomplete-profile banner. Reuses the canonical getProfileCompletion
// helper so the dashboard, the profile ring, and saveProfile all agree.

type Row = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

// getProfileCompletion only inspects whether each company/institution string is
// non-empty, so a lightweight coercion is enough — no need for the full mapper.
function toCompletionInput(row: Row): CompletionInput {
  const objArray = (v: unknown): Record<string, unknown>[] =>
    Array.isArray(v) ? v.map((o) => (o ?? {}) as Record<string, unknown>) : [];

  return {
    full_name: str(row.full_name),
    phone: str(row.phone),
    location: str(row.location),
    current_title: str(row.current_title),
    experience_level: str(
      row.experience_level,
    ) as CompletionInput["experience_level"],
    skills: strArray(row.skills),
    work_experience: objArray(row.work_experience).map((o) => ({
      company: str(o.company),
      job_title: str(o.job_title),
      start_date: str(o.start_date),
      end_date: str(o.end_date),
      current: o.current === true,
      responsibilities: str(o.responsibilities),
    })),
    education: objArray(row.education).map((o) => ({
      degree: str(o.degree),
      field: str(o.field),
      institution: str(o.institution),
      graduation_year: str(o.graduation_year),
    })),
    job_titles_seeking: strArray(row.job_titles_seeking),
    remote_preference: str(
      row.remote_preference,
    ) as CompletionInput["remote_preference"],
  };
}

export type ProfileStatus = {
  isComplete: boolean;
  percentage: number;
  missingFields: string[];
};

// Degrades to "incomplete, everything missing" on any auth/db failure — the
// banner is a nudge, never a blocker, so it should fail toward prompting the user.
export async function getProfileStatus(): Promise<ProfileStatus> {
  const empty = toCompletionInput({});
  try {
    const user = await getCurrentUser();
    if (!user) return getProfileCompletion(empty);

    const insforge = await createInsforgeServer();
    const { data } = await insforge.database
      .from("profiles")
      .select()
      .eq("id", user.id)
      .maybeSingle();

    const row = (data ?? null) as Row | null;
    return getProfileCompletion(row ? toCompletionInput(row) : empty);
  } catch {
    return getProfileCompletion(empty);
  }
}
