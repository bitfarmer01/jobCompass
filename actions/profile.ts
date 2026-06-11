"use server";

import { revalidatePath } from "next/cache";

import { createInsforgeServer } from "@/lib/insforge-server";
import { createPostHogServer } from "@/lib/posthog-server";
import { getProfileCompletion } from "@/lib/profile-completion";
import {
  RESUME_BUCKET,
  overwriteResume,
  resumePath,
} from "@/lib/resume-storage";
import type {
  CoverLetterTone,
  Education,
  ExperienceLevel,
  RemotePreference,
  WorkAuthorization,
  WorkExperience,
} from "@/types";

// What the client form sends. Mirrors Profile MINUS id/email (re-read from auth),
// is_complete (computed here), and resume_pdf_url (deferred to feature 07/08).
// `education` is the single record the form edits, not an array.
export type ProfileFormData = {
  full_name: string;
  phone: string;
  location: string;
  current_title: string;
  experience_level: ExperienceLevel | "";
  years_experience: string;
  skills: string[];
  industries: string[];
  work_experience: WorkExperience[];
  education: Education;
  job_titles_seeking: string[];
  remote_preference: RemotePreference | "";
  preferred_locations: string[];
  salary_expectation: string;
  cover_letter_tone: CoverLetterTone | "";
  linkedin_url: string;
  portfolio_url: string;
  work_authorization: WorkAuthorization | "";
};

type NormalizedProfile = {
  full_name: string;
  phone: string;
  location: string;
  current_title: string;
  experience_level: string | null;
  years_experience: number | null;
  skills: string[];
  industries: string[];
  work_experience: WorkExperience[];
  education: Education[];
  job_titles_seeking: string[];
  remote_preference: string | null;
  preferred_locations: string[];
  salary_expectation: string;
  cover_letter_tone: string | null;
  linkedin_url: string;
  portfolio_url: string;
  work_authorization: string | null;
};

const emptyToNull = (v: string): string | null => (v === "" ? null : v);

const cleanArray = (values: string[]): string[] =>
  values.map((v) => v.trim()).filter((v) => v !== "");

function educationToArray(e: Education): Education[] {
  const filled =
    e.degree.trim() !== "" ||
    e.field.trim() !== "" ||
    e.institution.trim() !== "" ||
    e.graduation_year.trim() !== "";
  return filled ? [e] : [];
}

function normalize(
  input: ProfileFormData,
): { ok: true; value: NormalizedProfile } | { ok: false; error: string } {
  const yearsRaw = input.years_experience.trim();
  let years: number | null = null;
  if (yearsRaw !== "") {
    const parsed = Number.parseInt(yearsRaw, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      return { ok: false, error: "Years of experience must be a number." };
    }
    years = parsed;
  }

  const roles = input.work_experience.filter((r) => r.company.trim() !== "");
  if (roles.length > 3) {
    return { ok: false, error: "Add at most 3 work experience roles." };
  }

  return {
    ok: true,
    value: {
      full_name: input.full_name.trim(),
      phone: input.phone.trim(),
      location: input.location.trim(),
      current_title: input.current_title.trim(),
      experience_level: emptyToNull(input.experience_level),
      years_experience: years,
      skills: cleanArray(input.skills),
      industries: cleanArray(input.industries),
      work_experience: roles,
      education: educationToArray(input.education),
      job_titles_seeking: cleanArray(input.job_titles_seeking),
      remote_preference: emptyToNull(input.remote_preference),
      preferred_locations: cleanArray(input.preferred_locations),
      salary_expectation: input.salary_expectation.trim(),
      cover_letter_tone: emptyToNull(input.cover_letter_tone),
      linkedin_url: input.linkedin_url.trim(),
      portfolio_url: input.portfolio_url.trim(),
      work_authorization: emptyToNull(input.work_authorization),
    },
  };
}

const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5 MB

// Uploads a PDF to the PRIVATE resumes bucket and records its storage path on
// the profile. The bucket has no public URL — the file is served only through
// the authenticated GET /api/resume route. Path is derived from the session
// user, so a user can only ever write/overwrite their own resume.
export async function uploadResume(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const file = formData.get("resume");
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "No file provided." };
    }
    if (file.type !== "application/pdf") {
      return { success: false, error: "Resume must be a PDF." };
    }
    if (file.size > MAX_RESUME_BYTES) {
      return { success: false, error: "Resume must be under 5 MB." };
    }

    const insforge = await createInsforgeServer();
    const { data: authData, error: authError } =
      await insforge.auth.getCurrentUser();
    const user = authData?.user;
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const path = resumePath(user.id);

    const { error: uploadError } = await overwriteResume(insforge, user.id, file);
    if (uploadError) {
      console.error("[actions/profile] resume upload", uploadError);
      return { success: false, error: "Failed to upload resume" };
    }

    const { error: dbError } = await insforge.database
      .from("profiles")
      .upsert({ id: user.id, email: user.email, resume_pdf_url: path })
      .select();
    if (dbError) {
      console.error("[actions/profile] resume url save", dbError.message);
      return { success: false, error: "Failed to save resume" };
    }

    const posthog = createPostHogServer();
    posthog.capture({
      distinctId: user.id,
      event: "resume_uploaded",
      properties: { userId: user.id },
    });
    await posthog.shutdown();

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[actions/profile] uploadResume", msg);
    return { success: false, error: "Failed to upload resume" };
  }
}

export async function deleteResume(): Promise<{ success: boolean; error?: string }> {
  try {
    const insforge = await createInsforgeServer();
    const { data: authData, error: authError } =
      await insforge.auth.getCurrentUser();
    const user = authData?.user;
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const path = resumePath(user.id);
    // Non-fatal — if the file is already gone from storage, the DB record must
    // still be cleared so the user is never stuck with a broken reference.
    try {
      await insforge.storage.from(RESUME_BUCKET).remove(path);
    } catch (storageErr) {
      console.error("[actions/profile] deleteResume storage:", storageErr);
    }

    const { error: dbError } = await insforge.database
      .from("profiles")
      .update({ resume_pdf_url: null })
      .eq("id", user.id);
    if (dbError) {
      console.error("[actions/profile] deleteResume db:", dbError.message);
      return { success: false, error: "Failed to update profile." };
    }

    const posthog = createPostHogServer();
    posthog.capture({
      distinctId: user.id,
      event: "resume_deleted",
      properties: { userId: user.id },
    });
    await posthog.shutdown();

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[actions/profile] deleteResume", msg);
    return { success: false, error: "Failed to delete resume." };
  }
}

export async function saveProfile(
  input: ProfileFormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const insforge = await createInsforgeServer();

    const { data: authData, error: authError } =
      await insforge.auth.getCurrentUser();
    const user = authData?.user;
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const normalized = normalize(input);
    if (!normalized.ok) {
      return { success: false, error: normalized.error };
    }
    const fields = normalized.value;

    const { data: existing } = await insforge.database
      .from("profiles")
      .select("is_complete")
      .eq("id", user.id)
      .maybeSingle();
    const wasComplete = existing?.is_complete === true;

    const { isComplete } = getProfileCompletion({
      full_name: fields.full_name,
      phone: fields.phone,
      location: fields.location,
      current_title: fields.current_title,
      experience_level: input.experience_level,
      skills: fields.skills,
      work_experience: fields.work_experience,
      job_titles_seeking: fields.job_titles_seeking,
      remote_preference: input.remote_preference,
      education: fields.education,
    });

    const { error: upsertError } = await insforge.database
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
        ...fields,
        is_complete: isComplete,
      })
      .select();

    if (upsertError) {
      console.error("[actions/profile]", upsertError.message);
      return { success: false, error: "Failed to save profile" };
    }

    if (isComplete && !wasComplete) {
      const posthog = createPostHogServer();
      posthog.capture({
        distinctId: user.id,
        event: "profile_completed",
        properties: { userId: user.id },
      });
      await posthog.shutdown();
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[actions/profile]", msg);
    return { success: false, error: "Failed to save profile" };
  }
}
