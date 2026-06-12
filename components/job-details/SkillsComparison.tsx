import { Check, ListChecks } from "@/components/icons";

type Props = {
  matched: string[];
  missing: string[];
};

export function SkillsComparison({ matched, missing }: Props) {
  const hasAny = matched.length > 0 || missing.length > 0;

  return (
    <section className="rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <ListChecks className="w-4 h-4 text-accent" />
        <h2 className="text-xs font-medium text-text-secondary uppercase tracking-wide">
          Required Skills vs Your Profile
        </h2>
      </div>

      {!hasAny ? (
        <p className="text-sm text-text-muted">No skill data for this job.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {matched.length > 0 && (
            <div>
              <p className="text-xs text-text-muted mb-2">You have</p>
              <div className="flex flex-wrap gap-2">
                {matched.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-success-lightest text-success-foreground"
                  >
                    <Check className="w-3 h-3" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {missing.length > 0 && (
            <div>
              <p className="text-xs text-text-muted mb-2">Skills to develop</p>
              <div className="flex flex-wrap gap-2">
                {missing.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
