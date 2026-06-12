import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { ApplyBar } from "@/components/job-details/ApplyBar";
import { CompanyResearch } from "@/components/job-details/CompanyResearch";
import { JobDescription } from "@/components/job-details/JobDescription";
import { JobHeader } from "@/components/job-details/JobHeader";
import { JobInfoCards } from "@/components/job-details/JobInfoCards";
import { MatchReasoning } from "@/components/job-details/MatchReasoning";
import { SkillsComparison } from "@/components/job-details/SkillsComparison";
import { getJobById } from "@/lib/jobs";

export default async function JobDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJobById(id);
  if (!job) notFound();

  const applyUrl = job.external_apply_url ?? job.source_url;

  return (
    <div className="w-full max-w-3xl mx-auto px-8 py-8 flex flex-col gap-5">
      <Link
        href="/find-jobs"
        className="inline-flex items-center gap-1.5 w-fit text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Jobs
      </Link>

      <div className="w-full bg-surface border border-border rounded-2xl shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] p-6 flex flex-col gap-5">
        <JobHeader job={job} applyUrl={applyUrl} />
        <JobInfoCards job={job} />
        <MatchReasoning reason={job.match_reason} />
        <SkillsComparison
          matched={job.matched_skills}
          missing={job.missing_skills}
        />
        <JobDescription text={job.about_role} sourceUrl={applyUrl} />
        <CompanyResearch company={job.company} />
      </div>

      <ApplyBar url={applyUrl} company={job.company} />
    </div>
  );
}
