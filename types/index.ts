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
