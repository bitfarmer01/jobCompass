import { SearchControls } from "@/components/find-jobs/SearchControls";
import { JobFilters } from "@/components/find-jobs/JobFilters";
import { JobsTable } from "@/components/find-jobs/JobsTable";
import { JobsPagination } from "@/components/find-jobs/JobsPagination";

export default function FindJobsPage() {
  return (
    <div className="w-full max-w-[1440px] mx-auto px-8 py-8 flex flex-col gap-6">
      <SearchControls />
      <div className="w-full bg-surface border border-border rounded-2xl shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <JobFilters />
        </div>
        <JobsTable />
        <div className="px-6 py-4 border-t border-border">
          <JobsPagination />
        </div>
      </div>
    </div>
  );
}
