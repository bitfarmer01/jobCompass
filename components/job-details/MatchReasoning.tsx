import { Sparkles } from "@/components/icons";

export function MatchReasoning({ reason }: { reason: string | null }) {
  return (
    <section className="rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-accent" />
        <h2 className="text-xs font-medium text-text-secondary uppercase tracking-wide">
          AI Match Reasoning
        </h2>
      </div>
      <p className="text-sm leading-relaxed text-text-dark">
        {reason ?? "No match reasoning available for this job."}
      </p>
    </section>
  );
}
