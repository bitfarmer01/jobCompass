"use client";

import { useState } from "react";
import { MATCH_THRESHOLD, formatRelativeTime } from "@/lib/utils";
import { JobFilters } from "@/components/find-jobs/JobFilters";
import { JobsTable, type JobRow } from "@/components/find-jobs/JobsTable";
import { JobsPagination } from "@/components/find-jobs/JobsPagination";
import type { Job } from "@/types";

type Props = {
  jobs: Job[];
};

const PER_PAGE = 20;

// Flatten a DB Job into the table's display row, resolving nullable columns to
// sensible placeholders so a missing salary/title/score never renders blank.
function toRow(job: Job): JobRow {
  return {
    id: job.id,
    company: job.company ?? "Unknown company",
    role: job.title ?? "Untitled role",
    matchScore: job.match_score ?? 0,
    salary: job.salary ?? "—",
    source: job.source,
    dateFound: formatRelativeTime(job.found_at),
  };
}

export function JobsSection({ jobs }: Props) {
  const [filterText, setFilterText] = useState("");
  const [matchFilter, setMatchFilter] = useState("all");
  const [sortBy, setSortBy] = useState("match-score");
  const [currentPage, setCurrentPage] = useState(1);

  // Any change to the filter/sort criteria resets to page 1 — otherwise a
  // narrowed result set could leave you stranded on a now-empty page.
  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setCurrentPage(1);
    };
  }

  const filteredJobs = jobs
    .filter((job) => {
      if (filterText) {
        const q = filterText.toLowerCase();
        const company = (job.company ?? "").toLowerCase();
        const role = (job.title ?? "").toLowerCase();
        if (!company.includes(q) && !role.includes(q)) return false;
      }
      const score = job.match_score ?? 0;
      if (matchFilter === "high" && score < MATCH_THRESHOLD) return false;
      if (matchFilter === "low" && score >= MATCH_THRESHOLD) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "match-score") {
        return (b.match_score ?? 0) - (a.match_score ?? 0);
      }
      const at = new Date(a.found_at).getTime();
      const bt = new Date(b.found_at).getTime();
      return sortBy === "oldest" ? at - bt : bt - at;
    })
    .map(toRow);

  // Clamp the page so it stays valid if the result set shrank (e.g. after a
  // refresh removed jobs) without waiting for the reset handlers to fire.
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageJobs = filteredJobs.slice(
    (safePage - 1) * PER_PAGE,
    safePage * PER_PAGE,
  );

  return (
    <div className="w-full bg-surface border border-border rounded-2xl shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <JobFilters
          filterText={filterText}
          onFilterTextChange={resetPage(setFilterText)}
          matchFilter={matchFilter}
          onMatchFilterChange={resetPage(setMatchFilter)}
          sortBy={sortBy}
          onSortByChange={resetPage(setSortBy)}
        />
      </div>
      <JobsTable jobs={pageJobs} />
      <div className="px-6 py-4 border-t border-border">
        <JobsPagination
          total={filteredJobs.length}
          perPage={PER_PAGE}
          currentPage={safePage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
