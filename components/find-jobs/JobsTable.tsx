"use client";

import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

type JobSource = "search" | "url";

// Mock display row — replaced with real data from the `jobs` table in a later
// feature. Shape mirrors the columns the table renders.
type MockJob = {
  id: string;
  company: string;
  role: string;
  matchScore: number;
  salary: string;
  source: JobSource;
  dateFound: string;
};

const MOCK_JOBS: MockJob[] = [
  { id: "1", company: "Vercel", role: "Senior Frontend Engineer", matchScore: 94, salary: "$160k - $210k", source: "search", dateFound: "2 days ago" },
  { id: "2", company: "Stripe", role: "Product Engineer", matchScore: 88, salary: "$170k - $230k", source: "search", dateFound: "3 days ago" },
  { id: "3", company: "Linear", role: "Frontend Engineer", matchScore: 96, salary: "$150k - $200k", source: "url", dateFound: "4 days ago" },
  { id: "4", company: "Notion", role: "Software Engineer, Web", matchScore: 72, salary: "$155k - $205k", source: "search", dateFound: "5 days ago" },
  { id: "5", company: "Anthropic", role: "Frontend Engineer", matchScore: 91, salary: "$180k - $240k", source: "search", dateFound: "6 days ago" },
  { id: "6", company: "Figma", role: "UI Engineer", matchScore: 85, salary: "$165k - $215k", source: "url", dateFound: "1 week ago" },
];

// Thresholds calibrated to match the design: ≥90 green, ≥75 blue, <75 orange
function scoreBarColor(score: number): string {
  if (score >= 90) return "bg-success";
  if (score >= 75) return "bg-info-medium";
  return "bg-warning";
}

function SourceBadge({ source }: { source: JobSource }) {
  if (source === "search") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-light text-accent">
        Search
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-secondary text-text-secondary">
      URL
    </span>
  );
}

export function JobsTable() {
  const router = useRouter();
  const jobs = MOCK_JOBS;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide w-48">
              Company
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide w-48">
              Match Score
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide w-36">
              Salary Est.
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide w-24">
              Source
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide w-28">
              Date Found
            </th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job, index) => (
            <tr
              key={job.id}
              onClick={() => router.push(`/find-jobs/${job.id}`)}
              className={`hover:bg-surface-secondary transition-colors cursor-pointer${index < jobs.length - 1 ? " border-b border-border" : ""}`}
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-surface-secondary border border-border flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-text-muted" />
                  </div>
                  <span className="text-sm font-medium text-text-primary">
                    {job.company}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-text-primary">{job.role}</span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-20 h-1 rounded-full bg-border-light overflow-hidden flex-shrink-0">
                    <div
                      className={`h-full rounded-full ${scoreBarColor(job.matchScore)}`}
                      style={{ width: `${job.matchScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-text-primary">
                    {job.matchScore}%
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-text-primary">{job.salary}</span>
              </td>
              <td className="px-6 py-4">
                <SourceBadge source={job.source} />
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-text-muted">{job.dateFound}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
