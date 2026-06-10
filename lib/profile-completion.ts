import type { Education, Profile } from "@/types";

// Single source of truth for profile completeness. Framework-agnostic (no React
// or Next imports) so the client form (live ring) and the saveProfile Server
// Action (authoritative is_complete) compute the exact same result.

export type RequiredFieldKey =
  | "full_name"
  | "phone"
  | "location"
  | "current_title"
  | "experience_level"
  | "skills"
  | "work_experience"
  | "education"
  | "job_titles_seeking"
  | "remote_preference";

export type CompletionInput = Pick<
  Profile,
  | "full_name"
  | "phone"
  | "location"
  | "current_title"
  | "experience_level"
  | "skills"
  | "work_experience"
  | "job_titles_seeking"
  | "remote_preference"
> & {
  education: Education[];
};

// Order = order the chips render in the completion banner.
export const REQUIRED_FIELDS: { key: RequiredFieldKey; label: string }[] = [
  { key: "full_name", label: "Full Name" },
  { key: "phone", label: "Phone" },
  { key: "location", label: "Location" },
  { key: "current_title", label: "Current Title" },
  { key: "experience_level", label: "Experience Level" },
  { key: "skills", label: "Skills" },
  { key: "work_experience", label: "Work Experience" },
  { key: "education", label: "Education" },
  { key: "job_titles_seeking", label: "Job Titles" },
  { key: "remote_preference", label: "Remote Preference" },
];

function isFieldFilled(key: RequiredFieldKey, p: CompletionInput): boolean {
  switch (key) {
    case "full_name":
      return p.full_name.trim() !== "";
    case "phone":
      return p.phone.trim() !== "";
    case "location":
      return p.location.trim() !== "";
    case "current_title":
      return p.current_title.trim() !== "";
    case "experience_level":
      return p.experience_level !== "";
    case "skills":
      return p.skills.length > 0;
    case "work_experience":
      return p.work_experience.some((r) => r.company.trim() !== "");
    case "education":
      return p.education.some((e) => e.institution.trim() !== "");
    case "job_titles_seeking":
      return p.job_titles_seeking.length > 0;
    case "remote_preference":
      return p.remote_preference !== "";
  }
}

export function getProfileCompletion(p: CompletionInput): {
  percentage: number;
  missingFields: string[];
  isComplete: boolean;
} {
  const missingFields = REQUIRED_FIELDS.filter(
    (f) => !isFieldFilled(f.key, p),
  ).map((f) => f.label);
  const filledCount = REQUIRED_FIELDS.length - missingFields.length;
  const percentage = Math.round((filledCount / REQUIRED_FIELDS.length) * 100);
  return { percentage, missingFields, isComplete: missingFields.length === 0 };
}
