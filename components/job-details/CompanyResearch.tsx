"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ExternalLink,
  Loader2,
  Search,
  TriangleAlert,
} from "@/components/icons";

import { Button } from "@/components/ui/button";
import type { CompanyDossier } from "@/types";

type Props = {
  jobId: string;
  company: string | null;
  research: CompanyDossier | null;
};

// --- Dossier section helpers (skip entirely when their content is empty) ----

function Paragraph({ title, text }: { title: string; text: string }) {
  if (!text) return null;
  return (
    <div>
      <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-text-dark">{text}</p>
    </div>
  );
}

function TagList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-accent-muted text-accent"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function BulletList({
  title,
  items,
  highlight = false,
}: {
  title: string;
  items: string[];
  highlight?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div
      className={
        highlight ? "rounded-lg border border-accent/30 bg-accent/5 p-4" : ""
      }
    >
      <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">
        {title}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="text-sm leading-relaxed text-text-dark flex gap-2"
          >
            <span className="text-accent flex-shrink-0">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Sources({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-border-light">
      <span className="text-xs text-text-muted">Sources:</span>
      {urls.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors break-all"
        >
          {url.replace(/^https?:\/\//, "")}
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
      ))}
    </div>
  );
}

export function CompanyResearch({ jobId, company, research }: Props) {
  const router = useRouter();
  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = company ?? "this company";

  async function handleResearch() {
    if (isResearching) return;
    setIsResearching(true);
    setError(null);
    try {
      const response = await fetch("/api/agent/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        // Re-run the server page — it re-reads the job row and passes the
        // saved dossier back down as the `research` prop. isResearching stays
        // true on purpose: resetting it here would flash the empty state until
        // the refreshed payload arrives; once `research` is non-null this
        // branch of the UI disappears entirely.
        router.refresh();
        return;
      }
      setError(data?.error ?? "Research failed. Please try again.");
    } catch {
      setError("Research failed. Please try again.");
    }
    setIsResearching(false);
  }

  return (
    <section className="rounded-xl border border-border p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-accent" />
          <h2 className="text-base font-semibold text-text-primary">
            Company Research
          </h2>
        </div>
        {!research && (
          <Button
            variant="default"
            size="sm"
            onClick={handleResearch}
            disabled={isResearching}
          >
            {isResearching ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Search />
            )}
            {isResearching ? "Researching…" : "Research Company"}
          </Button>
        )}
      </div>

      {research ? (
        <div className="flex flex-col gap-5">
          <Paragraph title="Company Overview" text={research.companyOverview} />
          <TagList title="Tech Stack" items={research.techStack} />
          <BulletList title="Culture" items={research.culture} />
          <Paragraph title="Why This Role" text={research.whyThisRole} />
          <BulletList title="Your Edge" items={research.yourEdge} highlight />
          <BulletList title="Gaps to Address" items={research.gapsToAddress} />
          <BulletList title="Smart Questions" items={research.smartQuestions} />
          <BulletList title="Interview Prep" items={research.interviewPrep} />
          <Sources urls={research.sources} />
        </div>
      ) : isResearching ? (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center text-center gap-2 py-8"
        >
          <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-accent animate-spin" />
          </div>
          <p className="text-sm font-medium text-text-primary">
            Researching {name}…
          </p>
          <p className="text-sm text-text-muted max-w-sm">
            Reading {name}&rsquo;s site and building your dossier — usually
            done in under a minute. Keep this page open.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center gap-2 py-8">
          <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-text-muted" />
          </div>
          <p className="text-sm font-medium text-text-primary">
            No research yet
          </p>
          <p className="text-sm text-text-muted max-w-sm">
            Click &ldquo;Research Company&rdquo; to let the AI browse {name}
            &rsquo;s public pages and build a dossier.
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-error/30 bg-error/10"
        >
          <TriangleAlert className="w-4 h-4 text-error flex-shrink-0" />
          <span className="text-sm font-medium text-error">{error}</span>
        </div>
      )}
    </section>
  );
}
