"use client";

import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchControls() {
  const [jobTitle, setJobTitle] = useState("Frontend Engineer");
  const [location, setLocation] = useState("Remote");

  return (
    <div className="w-full bg-surface border border-border rounded-2xl p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
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
          type="button"
          className="flex items-center gap-2 h-10 shrink-0"
        >
          <Search className="w-4 h-4" />
          Find Jobs
        </Button>
      </div>
      <div className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-success/30 bg-success/10">
        <Sparkles className="w-4 h-4 text-success flex-shrink-0" />
        <span className="text-sm font-medium text-success">
          Found 8 jobs and saved 4 strong matches.
        </span>
      </div>
    </div>
  );
}
