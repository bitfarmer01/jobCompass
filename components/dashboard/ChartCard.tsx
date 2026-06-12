"use client";

import { type ReactNode, useSyncExternalStore } from "react";
import { Sparkles } from "@/components/icons";

// Stable no-op subscription — mount state never changes after hydration, so
// there is nothing to subscribe to.
const noopSubscribe = () => () => {};

// false on the server, true once hydrated on the client. useSyncExternalStore
// gives us that without a setState-in-effect (which React's lint flags), so the
// chart body only ever renders client-side.
function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

// Centered empty state for a chart with no data yet — matches the RecentActivity
// empty state. Renders server-side too (it needs no DOM), so it shows without the
// mount-gate flash the chart body has.
function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 h-full">
      <Sparkles className="w-7 h-7 text-text-muted" />
      <p className="text-sm text-text-muted">{label}</p>
    </div>
  );
}

// Shared shell for the three dashboard charts — standard white card + title.
// The chart body renders only after mount: recharts' ResponsiveContainer can't
// measure a 0x0 container during SSR (logs a width(-1)/height(-1) warning), and
// it needs the real DOM anyway. The fixed-height box keeps layout stable. When
// `isEmpty`, the empty state shows instead of the (mount-gated) chart body.
export function ChartCard({
  title,
  isEmpty = false,
  emptyLabel = "No data yet.",
  children,
}: {
  title: string;
  isEmpty?: boolean;
  emptyLabel?: string;
  children: ReactNode;
}) {
  const mounted = useMounted();

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col gap-5 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      <div className="h-56 w-full">
        {isEmpty ? <ChartEmpty label={emptyLabel} /> : mounted ? children : null}
      </div>
    </div>
  );
}
