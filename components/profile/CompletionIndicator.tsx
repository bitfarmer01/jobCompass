import { CheckCircle2 } from "@/components/icons";

type Props = {
  percentage: number;
  missingFields: string[];
};

const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CompletionIndicator({
  percentage,
  missingFields,
}: Props) {
  const complete = percentage >= 100;
  const dashOffset = CIRCUMFERENCE - (percentage / 100) * CIRCUMFERENCE;

  return (
    <div className="w-full bg-surface border border-border rounded-2xl p-6 flex items-center gap-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <div className="relative flex-shrink-0">
        <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
          <circle
            cx="38"
            cy="38"
            r={RADIUS}
            fill="none"
            strokeWidth="6"
            className="stroke-border-light"
          />
          <circle
            cx="38"
            cy="38"
            r={RADIUS}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className={complete ? "stroke-success" : "stroke-accent"}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-text-primary">
          {percentage}%
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {complete ? (
          <>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <h2 className="text-base font-semibold text-text-primary">
                Your profile is complete
              </h2>
            </div>
            <p className="text-sm text-text-secondary">
              You&apos;re all set — agents have everything they need to match
              and tailor.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-base font-semibold text-text-primary">
              Your profile needs attention
            </h2>
            <p className="text-sm text-text-secondary">
              Complete these fields to unlock better job matches:
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
          </>
        )}
      </div>
    </div>
  );
}
