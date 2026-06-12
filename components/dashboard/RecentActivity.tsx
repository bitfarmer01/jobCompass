import { Sparkles } from "@/components/icons";
import type { ActivityItem, ActivityType } from "@/lib/activity";
import { formatRelativeTime } from "@/lib/utils";

// Dot colors per entry type (build-plan §16: "info blue, success green") using
// the ui-tokens Activity Dots treatment — outer ring + inner dot.
const DOT: Record<ActivityType, { ring: string; dot: string }> = {
  search: { ring: "bg-success-light", dot: "bg-success-alt" },
  research: { ring: "bg-info-light", dot: "bg-info" },
};

function Dot({ type }: { type: ActivityType }) {
  const { ring, dot } = DOT[type];
  return (
    <span
      className={`relative w-4 h-4 rounded-full ${ring} border border-surface flex items-center justify-center flex-shrink-0`}
    >
      <span className={`w-2 h-2 rounded-full ${dot}`} />
    </span>
  );
}

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col gap-4 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <h2 className="text-base font-semibold text-text-primary">
        Recent Activity
      </h2>

      {items.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-2 py-10">
          <Sparkles className="w-8 h-8 text-text-muted" />
          <p className="text-sm font-medium text-text-primary">
            No activity yet
          </p>
          <p className="text-sm text-text-muted">
            Run a job search or research a company to see it here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {items.map((item, i) => (
            <li
              key={item.id}
              className={`flex items-center gap-3 py-3 ${
                i < items.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <Dot type={item.type} />
              <span className="flex-1 text-sm font-medium text-text-primary min-w-0">
                {item.text}
              </span>
              <span className="text-xs text-text-muted whitespace-nowrap">
                {formatRelativeTime(item.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
