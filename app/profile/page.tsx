import { ProfileForm } from "@/components/profile/ProfileForm";
import { getCurrentUser } from "@/lib/auth";
import { blankProfile } from "@/lib/blank-profile";
import { createInsforgeServer } from "@/lib/insforge-server";
import type { Education, Profile, WorkExperience } from "@/types";

type ProfileRow = Partial<Record<keyof Profile, unknown>>;

const str = (v: unknown): string => (typeof v === "string" ? v : "");

const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

function toWorkExperience(v: unknown): WorkExperience[] {
  if (!Array.isArray(v)) return [];
  return v.map((item) => {
    // jsonb item — narrow the unknown object to read its fields safely.
    const o = (item ?? {}) as Record<string, unknown>;
    return {
      company: str(o.company),
      job_title: str(o.job_title),
      start_date: str(o.start_date),
      end_date: str(o.end_date),
      current: o.current === true,
      responsibilities: str(o.responsibilities),
    };
  });
}

function toEducation(v: unknown): Education[] {
  if (!Array.isArray(v)) return [];
  return v.map((item) => {
    const o = (item ?? {}) as Record<string, unknown>;
    return {
      degree: str(o.degree),
      field: str(o.field),
      institution: str(o.institution),
      graduation_year: str(o.graduation_year),
    };
  });
}

function mapRowToProfile(row: ProfileRow, id: string, email: string): Profile {
  return {
    id,
    full_name: str(row.full_name),
    email,
    phone: str(row.phone),
    location: str(row.location),
    current_title: str(row.current_title),
    // DB holds only valid enum values (written by saveProfile) or null.
    experience_level: str(row.experience_level) as Profile["experience_level"],
    years_experience:
      typeof row.years_experience === "number"
        ? String(row.years_experience)
        : str(row.years_experience),
    skills: strArray(row.skills),
    industries: strArray(row.industries),
    work_experience: toWorkExperience(row.work_experience),
    education: toEducation(row.education),
    job_titles_seeking: strArray(row.job_titles_seeking),
    remote_preference: str(row.remote_preference) as Profile["remote_preference"],
    preferred_locations: strArray(row.preferred_locations),
    salary_expectation: str(row.salary_expectation),
    cover_letter_tone: str(row.cover_letter_tone) as Profile["cover_letter_tone"],
    linkedin_url: str(row.linkedin_url),
    portfolio_url: str(row.portfolio_url),
    work_authorization: str(
      row.work_authorization,
    ) as Profile["work_authorization"],
    resume_pdf_url: str(row.resume_pdf_url),
    is_complete: row.is_complete === true,
  };
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const id = user?.id ?? "";
  const email = user?.email ?? "";

  let profile: Profile = blankProfile({ id, email });
  if (user) {
    const insforge = await createInsforgeServer();
    const { data } = await insforge.database
      .from("profiles")
      .select()
      .eq("id", user.id)
      .maybeSingle();
    const row: ProfileRow | null = data ?? null;
    if (row) profile = mapRowToProfile(row, user.id, email);
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-8 py-8 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-text-primary">Profile</h1>
        <p className="text-sm text-text-secondary">
          Keep this current — your agents match and tailor against it.
        </p>
      </div>

      <ProfileForm profile={profile} />
    </div>
  );
}
