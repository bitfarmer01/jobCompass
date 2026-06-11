"use client";

import { useState } from "react";
import { Loader2, Search, Sparkles, TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SearchResult =
  | { kind: "success"; jobsFound: number; strongMatches: number }
  | { kind: "error"; message: string };

export function SearchControls() {
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = jobTitle.trim();
    if (!title || isSearching) {
      if (!title) {
        setResult({ kind: "error", message: "Please enter a job title to search." });
      }
      return;
    }

    setIsSearching(true);
    setResult(null);
    try {
      const response = await fetch("/api/agent/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle: title, location: location.trim() }),
      });
      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        setResult({
          kind: "success",
          jobsFound: data.jobsFound ?? 0,
          strongMatches: data.strongMatches ?? 0,
        });
      } else {
        setResult({
          kind: "error",
          message: data?.error ?? "Job search failed. Please try again.",
        });
      }
    } catch {
      setResult({ kind: "error", message: "Job search failed. Please try again." });
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="w-full bg-surface border border-border rounded-2xl p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex flex-col gap-1.5 flex-1">
            <label
              htmlFor="job-title-input"
              className="text-xs font-medium text-text-secondary uppercase tracking-wide"
            >
              Job Title
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <Input
                id="job-title-input"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Frontend Engineer"
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <label
              htmlFor="location-input"
              className="text-xs font-medium text-text-secondary uppercase tracking-wide"
            >
              Location
            </label>
            <Input
              id="location-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Remote, New York..."
            />
          </div>
          <Button
            type="submit"
            disabled={isSearching}
            className="flex items-center gap-2 h-10 shrink-0"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {isSearching ? "Searching..." : "Find Jobs"}
          </Button>
        </div>
      </form>
      {result?.kind === "success" && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-success/30 bg-success/10"
        >
          <Sparkles className="w-4 h-4 text-success flex-shrink-0" />
          <span className="text-sm font-medium text-success">
            Found {result.jobsFound} jobs and saved {result.strongMatches} strong
            matches.
          </span>
        </div>
      )}
      {result?.kind === "error" && (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-error/30 bg-error/10"
        >
          <TriangleAlert className="w-4 h-4 text-error flex-shrink-0" />
          <span className="text-sm font-medium text-error">{result.message}</span>
        </div>
      )}
    </div>
  );
}
