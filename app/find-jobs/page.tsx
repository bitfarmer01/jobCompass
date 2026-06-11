import { SearchControls } from "@/components/find-jobs/SearchControls";
import { JobsSection } from "@/components/find-jobs/JobsSection";
import { getUserJobs } from "@/lib/jobs";

export default async function FindJobsPage() {
  const jobs = await getUserJobs();

  return (
    <div className="w-full max-w-[1440px] mx-auto px-8 py-8 flex flex-col gap-6">
      <SearchControls />
      <JobsSection jobs={jobs} />
    </div>
  );
}
