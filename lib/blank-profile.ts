import type { Profile } from "@/types";

// Single source of truth for an empty Profile. Used by the profile page (no DB
// row yet) and the form's Clear action — a new Profile field is added here once.
export function blankProfile(
  base: Pick<Profile, "id" | "email"> &
    Partial<Pick<Profile, "resume_pdf_url">>,
): Profile {
  return {
    id: base.id,
    email: base.email,
    resume_pdf_url: base.resume_pdf_url ?? "",
    full_name: "",
    phone: "",
    location: "",
    current_title: "",
    experience_level: "",
    years_experience: "",
    skills: [],
    industries: [],
    work_experience: [],
    education: [],
    job_titles_seeking: [],
    remote_preference: "",
    preferred_locations: [],
    salary_expectation: "",
    cover_letter_tone: "",
    linkedin_url: "",
    portfolio_url: "",
    work_authorization: "",
    is_complete: false,
  };
}
