import { Briefcase, Calendar, DollarSign, MapPin } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { formatRelativeTime } from "@/lib/utils";
import type { Job } from "@/types";

const JOB_TYPE_LABELS: Record<string, string> = {
  fulltime: "Full-time",
  parttime: "Part-time",
  contract: "Contract",
};

function humanizeJobType(value: string | null): string {
  if (!value) return "—";
  return JOB_TYPE_LABELS[value] ?? value;
}

export function JobInfoCards({ job }: { job: Job }) {
  const cards: Array<{ icon: LucideIcon; label: string; value: string }> = [
    { icon: DollarSign, label: "Salary Est.", value: job.salary ?? "—" },
    { icon: MapPin, label: "Location", value: job.location ?? "—" },
    { icon: Briefcase, label: "Job Type", value: humanizeJobType(job.job_type) },
    {
      icon: Calendar,
      label: "Date Found",
      value: formatRelativeTime(job.found_at) || "—",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-xl border border-border p-3"
        >
          <div className="w-9 h-9 rounded-lg bg-accent-muted flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">
              {value}
            </p>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
