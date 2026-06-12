// Shared types across the project. The Profile shape mirrors the `profiles`
// table (snake_case) so Server Actions can write through with no mapping layer.

export type ExperienceLevel = "junior" | "mid" | "senior" | "lead";
export type RemotePreference = "remote" | "onsite" | "hybrid" | "any";
export type WorkAuthorization =
  | "citizen"
  | "permanent_resident"
  | "visa_required";
export type CoverLetterTone = "formal" | "casual" | "enthusiastic";

export type WorkExperience = {
  company: string;
  job_title: string;
  start_date: string;
  end_date: string;
  current: boolean;
  responsibilities: string;
};

export type Education = {
  degree: string;
  field: string;
  institution: string;
  graduation_year: string;
};

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  current_title: string;
  experience_level: ExperienceLevel | "";
  years_experience: string;
  skills: string[];
  industries: string[];
  work_experience: WorkExperience[];
  education: Education[];
  job_titles_seeking: string[];
  remote_preference: RemotePreference | "";
  preferred_locations: string[];
  salary_expectation: string;
  cover_letter_tone: CoverLetterTone | "";
  linkedin_url: string;
  portfolio_url: string;
  work_authorization: WorkAuthorization | "";
  resume_pdf_url: string;
  is_complete: boolean;
};

export type ExtractedProfile = Partial<
  Omit<Profile, "id" | "email" | "resume_pdf_url" | "is_complete">
>;

// Mirrors the `agent_runs` table (snake_case, see context/architecture.md).
export type AgentRunStatus = "running" | "completed" | "failed";

export type AgentRun = {
  id: string;
  user_id: string;
  status: AgentRunStatus;
  job_title_searched: string | null;
  location_searched: string | null;
  jobs_found: number;
  started_at: string;
  completed_at: string | null;
};

// Mirrors the `jobs` table (snake_case, see context/architecture.md).
export type Job = {
  id: string;
  run_id: string | null;
  user_id: string;
  source: "search" | "url";
  source_url: string | null;
  external_apply_url: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  salary: string | null;
  job_type: string | null;
  about_role: string | null;
  responsibilities: string[];
  requirements: string[];
  nice_to_have: string[];
  benefits: string[];
  about_company: string | null;
  match_score: number | null;
  match_reason: string | null;
  matched_skills: string[];
  missing_skills: string[];
  company_research: Record<string, unknown> | null;
  found_at: string;
};

// Insert shape for discovery — id is DB-generated, company_research arrives
// later from the research agent (feature 13).
export type JobInsert = Omit<Job, "id" | "company_research">;

// Output of agent/researcher.ts (feature 13) — the structured dossier saved to
// jobs.company_research (jsonb). Shape per build-plan §13; `sources` is always
// set programmatically to the URLs actually visited, never model output.
export type CompanyDossier = {
  companyOverview: string;
  techStack: string[];
  culture: string[];
  whyThisRole: string;
  yourEdge: string[];
  gapsToAddress: string[];
  smartQuestions: string[];
  interviewPrep: string[];
  sources: string[];
};

// Output of agent/matcher.ts — one NIM scoring call per discovered job.
export type JobScore = {
  matchScore: number;
  matchReason: string;
  matchedSkills: string[];
  missingSkills: string[];
};

export type GeneratedResumeContent = {
  summary: string;
  workExperience: Array<{
    company: string;
    jobTitle: string;
    startDate: string;
    endDate: string; // empty string when current === true
    current: boolean;
    bullets: string[]; // 3–5 polished action-verb bullets
  }>;
};
