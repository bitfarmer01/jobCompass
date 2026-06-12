"use client";

import { useRouter } from "next/navigation";
import { Building2, Briefcase } from "@/components/icons";

export type JobSource = "search" | "url";

// One display row for the jobs table — the flattened, presentation-ready shape
// JobsSection maps each DB `Job` into (raw nullable fields resolved here).
export type JobRow = {
  id: string;
  company: string;
  role: string;
  matchScore: number;
  salary: string;
  source: JobSource;
  dateFound: string;
};

type Props = {
  jobs: JobRow[];
};

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

export function JobsTable({ jobs }: Props) {
  const router = useRouter();

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
          {jobs.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-16">
                <div className="flex flex-col items-center gap-3 text-center">
                  <Briefcase className="w-10 h-10 text-text-muted" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      No jobs found
                    </p>
                    <p className="text-sm text-text-muted mt-1">
                      Run a search above to discover matching jobs.
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            jobs.map((job, index) => (
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
