import { Building2, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { scoreBadgeClass } from "@/lib/utils";
import type { Job } from "@/types";

type Props = {
  job: Job;
  applyUrl: string | null;
};

export function JobHeader({ job, applyUrl }: Props) {
  const score = job.match_score;

  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
      <div className="flex items-start gap-4 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-surface-secondary border border-border flex items-center justify-center flex-shrink-0">
          <Building2 className="w-6 h-6 text-text-muted" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-text-primary leading-tight">
            {job.title ?? "Untitled role"}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className="text-text-secondary truncate">
              {job.company ?? "Unknown company"}
            </span>
            <span className="text-text-muted">•</span>
            {score === null ? (
              <span className="text-text-muted">No match score</span>
            ) : (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${scoreBadgeClass(score)}`}
              >
                {score}% Match Score
              </span>
            )}
          </div>
        </div>
      </div>
      {applyUrl ? (
        <Button asChild variant="secondary" className="flex-shrink-0">
          <a href={applyUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink />
            View Job Post
          </a>
        </Button>
      ) : (
        <Button variant="secondary" disabled className="flex-shrink-0">
          <ExternalLink />
          View Job Post
        </Button>
      )}
    </div>
  );
}
