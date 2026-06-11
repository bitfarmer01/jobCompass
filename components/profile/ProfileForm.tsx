"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Plus, Save } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompletionIndicator } from "@/components/profile/CompletionIndicator";
import { TagInput } from "@/components/profile/TagInput";
import { WorkExperienceCard } from "@/components/profile/WorkExperienceCard";
import { ResumeUpload } from "@/components/profile/ResumeUpload";
import { saveProfile, type ProfileFormData } from "@/actions/profile";
import { getProfileCompletion } from "@/lib/profile-completion";
import type {
  Education,
  ExtractedProfile,
  Profile,
  WorkExperience,
} from "@/types";

type Props = {
  profile: Profile;
};

const EXPERIENCE_LEVELS = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid-level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
];

const WORK_AUTHORIZATIONS = [
  { value: "citizen", label: "Citizen" },
  { value: "permanent_resident", label: "Permanent Resident" },
  { value: "visa_required", label: "Requires Visa Sponsorship" },
];

const REMOTE_PREFERENCES = [
  { value: "remote", label: "Remote" },
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "any", label: "Any" },
];

const COVER_LETTER_TONES = [
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
  { value: "enthusiastic", label: "Enthusiastic" },
];

const DEGREES = [
  "High School",
  "Associate",
  "Bachelor's",
  "Master's",
  "PhD",
];

const EMPTY_ROLE: WorkExperience = {
  company: "",
  job_title: "",
  start_date: "",
  end_date: "",
  current: false,
  responsibilities: "",
};

const EMPTY_EDUCATION: Education = {
  degree: "",
  field: "",
  institution: "",
  graduation_year: "",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full bg-surface border border-border rounded-2xl p-6 flex flex-col gap-5 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function ProfileForm({ profile }: Props) {
  const [form, setForm] = useState<Profile>(profile);
  const [education, setEducation] = useState<Education>(
    profile.education[0] ?? EMPTY_EDUCATION,
  );
  const [isPending, startTransition] = useTransition();
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const { percentage, missingFields } = getProfileCompletion({
    full_name: form.full_name,
    phone: form.phone,
    location: form.location,
    current_title: form.current_title,
    experience_level: form.experience_level,
    skills: form.skills,
    work_experience: form.work_experience,
    job_titles_seeking: form.job_titles_seeking,
    remote_preference: form.remote_preference,
    education: [education],
  });

  const updateRole = (index: number, value: WorkExperience) =>
    set(
      "work_experience",
      form.work_experience.map((r, i) => (i === index ? value : r)),
    );

  const addRole = () =>
    set("work_experience", [...form.work_experience, { ...EMPTY_ROLE }]);

  const removeRole = (index: number) =>
    set(
      "work_experience",
      form.work_experience.filter((_, i) => i !== index),
    );

  const handleExtracted = (data: ExtractedProfile) => {
    const { education: extractedEdu, work_experience: extractedWork, ...scalarRest } = data;

    setForm((prev) => {
      const patch: Partial<Profile> = {};
      // Only apply fields where the model actually found a value — never clobber user data with ""
      for (const [k, v] of Object.entries(scalarRest)) {
        if (Array.isArray(v) ? v.length > 0 : v !== "" && v != null) {
          (patch as Record<string, unknown>)[k] = v;
        }
      }
      // Only replace work_experience if the model extracted at least one role
      if (extractedWork?.length) patch.work_experience = extractedWork;
      return { ...prev, ...patch };
    });

    // Only update education if at least one extracted field is non-empty
    if (extractedEdu?.[0] && Object.values(extractedEdu[0]).some((v) => v !== "")) {
      setEducation(extractedEdu[0]);
    }
  };

  const handleSave = () => {
    setBanner(null);
    startTransition(async () => {
      const payload: ProfileFormData = {
        full_name: form.full_name,
        phone: form.phone,
        location: form.location,
        current_title: form.current_title,
        experience_level: form.experience_level,
        years_experience: form.years_experience,
        skills: form.skills,
        industries: form.industries,
        work_experience: form.work_experience,
        education,
        job_titles_seeking: form.job_titles_seeking,
        remote_preference: form.remote_preference,
        preferred_locations: form.preferred_locations,
        salary_expectation: form.salary_expectation,
        cover_letter_tone: form.cover_letter_tone,
        linkedin_url: form.linkedin_url,
        portfolio_url: form.portfolio_url,
        work_authorization: form.work_authorization,
      };
      const res = await saveProfile(payload);
      setBanner(
        res.success
          ? { type: "success", msg: "Profile saved." }
          : { type: "error", msg: res.error ?? "Something went wrong." },
      );
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <CompletionIndicator
        percentage={percentage}
        missingFields={missingFields}
      />

      <ResumeUpload
        initialResumePath={form.resume_pdf_url}
        onExtracted={handleExtracted}
      />

      <Section title="Personal Info">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name" htmlFor="full_name">
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              placeholder="Jane Doe"
            />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" value={form.email} disabled readOnly />
          </Field>
          <Field label="Phone Number" htmlFor="phone">
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+1 555 123 4567"
            />
          </Field>
          <Field label="Location" htmlFor="location">
            <Input
              id="location"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="San Francisco, USA"
            />
          </Field>
          <Field label="LinkedIn URL" htmlFor="linkedin_url">
            <Input
              id="linkedin_url"
              value={form.linkedin_url}
              onChange={(e) => set("linkedin_url", e.target.value)}
              placeholder="https://linkedin.com/in/you"
            />
          </Field>
          <Field label="Portfolio / GitHub" htmlFor="portfolio_url">
            <Input
              id="portfolio_url"
              value={form.portfolio_url}
              onChange={(e) => set("portfolio_url", e.target.value)}
              placeholder="https://github.com/you"
            />
          </Field>
          <Field label="Work Authorization">
            <Select
              value={form.work_authorization}
              onValueChange={(v) =>
                set("work_authorization", v as Profile["work_authorization"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {WORK_AUTHORIZATIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Professional Info">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Current Job Title" htmlFor="current_title">
            <Input
              id="current_title"
              value={form.current_title}
              onChange={(e) => set("current_title", e.target.value)}
              placeholder="Frontend Engineer"
            />
          </Field>
          <Field label="Experience Level">
            <Select
              value={form.experience_level}
              onValueChange={(v) =>
                set("experience_level", v as Profile["experience_level"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVELS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Years of Experience" htmlFor="years_experience">
            <Input
              id="years_experience"
              type="number"
              min="0"
              value={form.years_experience}
              onChange={(e) => set("years_experience", e.target.value)}
              placeholder="5"
            />
          </Field>
        </div>
        <Field label="Skills">
          <TagInput
            values={form.skills}
            onChange={(v) => set("skills", v)}
            placeholder="Add a skill and press Enter"
          />
        </Field>
        <Field label="Industries">
          <TagInput
            values={form.industries}
            onChange={(v) => set("industries", v)}
            placeholder="Add an industry and press Enter"
          />
        </Field>
      </Section>

      <Section title="Work Experience">
        {form.work_experience.length === 0 ? (
          <p className="text-sm text-text-muted">
            No roles added yet. Add up to three.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {form.work_experience.map((role, index) => (
              <WorkExperienceCard
                key={index}
                index={index}
                value={role}
                onChange={(value) => updateRole(index, value)}
                onRemove={() => removeRole(index)}
              />
            ))}
          </div>
        )}
        {form.work_experience.length < 3 && (
          <Button
            type="button"
            variant="secondary"
            onClick={addRole}
            className="w-fit"
          >
            <Plus className="w-4 h-4" />
            Add Role
          </Button>
        )}
      </Section>

      <Section title="Education">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Highest Degree">
            <Select
              value={education.degree}
              onValueChange={(v) =>
                setEducation((prev) => ({ ...prev, degree: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select degree" />
              </SelectTrigger>
              <SelectContent>
                {DEGREES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Field of Study" htmlFor="edu_field">
            <Input
              id="edu_field"
              value={education.field}
              onChange={(e) =>
                setEducation((prev) => ({ ...prev, field: e.target.value }))
              }
              placeholder="Computer Science"
            />
          </Field>
          <Field label="Institution Name" htmlFor="edu_institution">
            <Input
              id="edu_institution"
              value={education.institution}
              onChange={(e) =>
                setEducation((prev) => ({
                  ...prev,
                  institution: e.target.value,
                }))
              }
              placeholder="Stanford University"
            />
          </Field>
          <Field label="Graduation Year" htmlFor="edu_year">
            <Input
              id="edu_year"
              type="number"
              min="1950"
              value={education.graduation_year}
              onChange={(e) =>
                setEducation((prev) => ({
                  ...prev,
                  graduation_year: e.target.value,
                }))
              }
              placeholder="2019"
            />
          </Field>
        </div>
      </Section>

      <Section title="Job Preferences">
        <Field label="Job Titles Seeking">
          <TagInput
            values={form.job_titles_seeking}
            onChange={(v) => set("job_titles_seeking", v)}
            placeholder="Add a target role and press Enter"
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Remote Preference">
            <Select
              value={form.remote_preference}
              onValueChange={(v) =>
                set("remote_preference", v as Profile["remote_preference"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select preference" />
              </SelectTrigger>
              <SelectContent>
                {REMOTE_PREFERENCES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Salary Expectation" htmlFor="salary_expectation">
            <Input
              id="salary_expectation"
              value={form.salary_expectation}
              onChange={(e) => set("salary_expectation", e.target.value)}
              placeholder="$120k - $150k"
            />
          </Field>
          <Field label="Cover Letter Tone">
            <Select
              value={form.cover_letter_tone}
              onValueChange={(v) =>
                set("cover_letter_tone", v as Profile["cover_letter_tone"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                {COVER_LETTER_TONES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Preferred Locations">
          <TagInput
            values={form.preferred_locations}
            onChange={(v) => set("preferred_locations", v)}
            placeholder="Add a location and press Enter"
          />
        </Field>
      </Section>

      <div className="flex flex-col gap-3">
        {banner && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm font-medium ${
              banner.type === "success"
                ? "border-success/30 bg-success/10 text-success"
                : "border-error/30 bg-error/10 text-error"
            }`}
          >
            {banner.msg}
          </div>
        )}
        <div className="flex justify-end">
          <Button type="button" onClick={handleSave} disabled={isPending}>
            <Save className="w-4 h-4" />
            {isPending ? "Saving…" : "Save Profile"}
          </Button>
        </div>
      </div>
    </div>
  );
}
