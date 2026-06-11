import { Building2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

// Empty state only for feature 12 — the Research Company button is wired to the
// research agent (POST /api/agent/research) in feature 13. Rendered here so the
// section matches the design and is visible/testable ahead of the logic.
export function CompanyResearch({ company }: { company: string | null }) {
  const name = company ?? "this company";

  return (
    <section className="rounded-xl border border-border p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-accent" />
          <h2 className="text-base font-semibold text-text-primary">
            Company Research
          </h2>
        </div>
        <Button variant="default" size="sm">
          <Search />
          Research Company
        </Button>
      </div>
      <div className="flex flex-col items-center text-center gap-2 py-8">
        <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center">
          <Building2 className="w-5 h-5 text-text-muted" />
        </div>
        <p className="text-sm font-medium text-text-primary">No research yet</p>
        <p className="text-sm text-text-muted max-w-sm">
          Click &ldquo;Research Company&rdquo; to let the AI browse {name}&rsquo;s
          public pages and build a dossier.
        </p>
      </div>
    </section>
  );
}
