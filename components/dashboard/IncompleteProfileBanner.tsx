import Link from "next/link";
import { ArrowRight, TriangleAlert } from "@/components/icons";
import { Button } from "@/components/ui/button";

// Shown at the top of the dashboard only when the profile is incomplete.
// Presentational — the page reads real completion via getProfileStatus().
export function IncompleteProfileBanner({
  percentage,
  missingFields,
}: {
  percentage: number;
  missingFields: string[];
}) {
  return (
    <div className="w-full bg-surface border border-border rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-5 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <div className="w-11 h-11 rounded-xl bg-accent-muted flex items-center justify-center flex-shrink-0">
        <TriangleAlert className="w-5 h-5 text-accent" />
      </div>

      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-text-primary">
            Your profile needs attention
          </h2>
          <span className="text-xs font-medium text-text-muted">
            {percentage}% complete
          </span>
        </div>
        <p className="text-sm text-text-secondary">
          Your agents match and tailor against your profile. Fill these in for
          stronger matches:
        </p>
        <div className="flex flex-wrap gap-2 mt-1">
          {missingFields.map((field) => (
            <span
              key={field}
              className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent-muted text-accent uppercase tracking-wide"
            >
              {field}
            </span>
          ))}
        </div>
      </div>

      <Button asChild className="shrink-0">
        <Link href="/profile">
          Complete profile
          <ArrowRight className="w-4 h-4" />
        </Link>
      </Button>
    </div>
  );
}
