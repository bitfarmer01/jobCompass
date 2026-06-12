import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Job match threshold — defined once, imported everywhere this value is needed.
export const MATCH_THRESHOLD = 70;

// Human-readable "time ago" for the Find Jobs table's Date Found column.
// Falls back to a short calendar date past a week. Returns "" on bad input
// so a malformed timestamp renders empty rather than "NaN".
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// Match-score badge classes by the canonical thresholds (ui-tokens.md → Match
// Score Colors). Keeps the job details header badge consistent with the bar
// color used in the jobs table. ≥90 green, ≥75 blue, below 75 orange.
export function scoreBadgeClass(score: number): string {
  if (score >= 90) return "bg-success-lightest text-success-foreground";
  if (score >= 75) return "bg-info-lightest text-info-foreground";
  return "bg-warning/10 text-warning";
}
