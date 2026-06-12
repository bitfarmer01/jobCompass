"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ExternalLink,
  Loader2,
  Search,
  TriangleAlert,
  Sparkles,
  Target,
  MessageSquare,
  Check,
  Compass,
  ListChecks,
} from "@/components/icons";

import { Button } from "@/components/ui/button";
import type { CompanyDossier } from "@/types";

type Props = {
  jobId: string;
  company: string | null;
  research: CompanyDossier | null;
};

// --- Custom Spotlight Sub-components for Premium Aesthetics ---

// Honest fit verdict — leads the Fit & Strategy tab. Tells the user plainly
// (but kindly) when a role is a stretch instead of selling every job as a fit.
// Hidden for legacy dossiers saved before fitLevel existed ("").
const FIT_VERDICT_STYLES = {
  strong: {
    label: "Strong Fit",
    wrapper: "border-success/20 bg-success-lightest/40",
    accentText: "text-success-darker",
    Icon: Check,
  },
  moderate: {
    label: "Moderate Fit",
    wrapper: "border-info/20 bg-info-lightest",
    accentText: "text-info-dark",
    Icon: Target,
  },
  stretch: {
    label: "Stretch Role",
    wrapper: "border-warning/20 bg-warning/5",
    accentText: "text-warning",
    Icon: Compass,
  },
} as const;

function FitVerdict({
  level,
  summary,
}: {
  level: "strong" | "moderate" | "stretch" | "";
  summary: string;
}) {
  if (!level || !summary) return null;
  const { label, wrapper, accentText, Icon } = FIT_VERDICT_STYLES[level];
  return (
    <div className={`rounded-xl border p-5 ${wrapper}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${accentText}`} />
        <h4 className={`text-sm font-bold uppercase tracking-wider ${accentText}`}>
          {label}
        </h4>
      </div>
      <p className="text-sm leading-relaxed text-text-dark">{summary}</p>
    </div>
  );
}

function SpotlightYourEdge({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-success/20 bg-success-lightest/40 p-5 shadow-sm relative overflow-hidden">
      <div className="absolute right-0 top-0 w-32 h-32 bg-success/5 rounded-full blur-2xl pointer-events-none -mr-8 -mt-8" />
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-success-darker" />
        <h4 className="text-sm font-bold text-success-darker uppercase tracking-wider">
          Your Competitive Edge
        </h4>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={index} className="text-sm leading-relaxed text-text-dark flex gap-2.5">
            <Check className="w-4 h-4 text-success-alt flex-shrink-0 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WhyThisRoleBlock({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="relative pl-5 border-l-4 border-accent bg-accent-muted/30 py-3.5 pr-4 rounded-r-lg">
      <div className="flex items-center gap-1.5 mb-1">
        <Target className="w-3.5 h-3.5 text-accent" />
        <h4 className="text-xs font-semibold text-accent uppercase tracking-wider">
          Why This Role Exists
        </h4>
      </div>
      <p className="text-sm leading-relaxed text-text-dark italic">
        &ldquo;{text}&rdquo;
      </p>
    </div>
  );
}

function GapsCoaching({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-warning/20 bg-warning/5 p-5 relative overflow-hidden">
      <div className="absolute right-0 top-0 w-32 h-32 bg-warning/5 rounded-full blur-2xl pointer-events-none -mr-8 -mt-8" />
      <div className="flex items-center gap-2 mb-3">
        <Compass className="w-5 h-5 text-warning" />
        <h4 className="text-sm font-bold text-warning uppercase tracking-wider">
          Preparation Strategy
        </h4>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={index} className="text-sm leading-relaxed text-text-dark flex gap-2.5">
            <Target className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TechStackChips({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2.5">
      <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
        Technology Stack
      </h4>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-accent-muted text-accent border border-accent/10 hover:border-accent/30 transition-all cursor-default"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function CultureGrid({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2.5">
      <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
        Company Culture &amp; Values
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex gap-2.5 p-3 rounded-lg bg-surface-secondary border border-border-light"
          >
            <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
            <span className="text-sm text-text-dark leading-relaxed">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InterviewPrepChecklist({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
        Interview Preparation Checklist
      </h4>
      <div className="flex flex-col gap-2.5">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex gap-3 p-3.5 rounded-lg border border-border bg-surface-secondary hover:border-accent/20 hover:bg-accent-muted/10 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-accent-light text-accent text-xs font-bold flex items-center justify-center flex-shrink-0">
              {index + 1}
            </div>
            <span className="text-sm text-text-dark leading-relaxed">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SmartQuestionsSpeech({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
        Strategic Questions to Ask
      </h4>
      <div className="grid grid-cols-1 gap-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex gap-3 p-4 rounded-xl border border-accent/20 bg-accent-muted/10 relative"
          >
            <MessageSquare className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
            <p className="text-sm text-text-dark font-medium leading-relaxed italic">
              &ldquo;{item}&rdquo;
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SourcesFooter({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-3 mt-4 border-t border-border-light">
      <span className="text-xs font-medium text-text-muted">Sources Researched:</span>
      {urls.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors break-all"
        >
          {url.replace(/^https?:\/\/(www\.)?/, "")}
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
      ))}
    </div>
  );
}

// --- Dynamic simulated loading steps ---
const loadingSteps = [
  "Launching secure cloud research browser...",
  "Navigating to employer's website...",
  "Crawling engineering and product sections...",
  "Extracting technology stack details...",
  "Analyzing company values and team culture...",
  "Mapping findings to your target skills...",
  "Drafting custom application prep briefings...",
  "Assembling final candidate dossier...",
];

export function CompanyResearch({ jobId, company, research }: Props) {
  const router = useRouter();
  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "fit" | "prep">("overview");
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  const name = company ?? "this company";

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResearching) {
      interval = setInterval(() => {
        setLoadingStepIndex((prev) =>
          prev < loadingSteps.length - 1 ? prev + 1 : prev
        );
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isResearching]);

  async function handleResearch() {
    if (isResearching) return;
    setLoadingStepIndex(0);
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
    <section className="rounded-xl border border-border p-6 bg-surface shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <Building2 className="w-5 h-5 text-accent" />
          <div>
            <h2 className="text-base font-bold text-text-primary">
              Company Research Agent
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              AI-generated company dossier &amp; preparation strategy
            </p>
          </div>
        </div>
        {!research && (
          <Button
            variant="default"
            size="sm"
            onClick={handleResearch}
            disabled={isResearching}
            className="w-full sm:w-auto shadow-sm"
          >
            {isResearching ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            {isResearching ? "Researching…" : "Research Company"}
          </Button>
        )}
      </div>

      {research ? (
        <div className="flex flex-col gap-5">
          {/* iOS-style segment tab switcher */}
          <div className="bg-surface-secondary p-1 rounded-lg flex gap-1 border border-border w-full">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-md transition-all ${
                activeTab === "overview"
                  ? "bg-surface text-text-primary shadow-sm border border-border-light"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-tertiary"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Overview &amp; Stack</span>
            </button>
            <button
              onClick={() => setActiveTab("fit")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-md transition-all ${
                activeTab === "fit"
                  ? "bg-surface text-text-primary shadow-sm border border-border-light"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-tertiary"
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Fit &amp; Strategy</span>
            </button>
            <button
              onClick={() => setActiveTab("prep")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-md transition-all ${
                activeTab === "prep"
                  ? "bg-surface text-text-primary shadow-sm border border-border-light"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-tertiary"
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>Interview Prep</span>
            </button>
          </div>

          {/* Tab Content Areas with smooth opacity states */}
          <div className="pt-2">
            {activeTab === "overview" && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                {research.companyOverview && (
                  <div>
                    <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                      About {company}
                    </h4>
                    <p className="text-sm leading-relaxed text-text-dark font-medium">
                      {research.companyOverview}
                    </p>
                  </div>
                )}
                <TechStackChips items={research.techStack} />
                <CultureGrid items={research.culture} />
                <SourcesFooter urls={research.sources} />
              </div>
            )}

            {activeTab === "fit" && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                <FitVerdict
                  level={research.fitLevel}
                  summary={research.fitSummary}
                />
                <SpotlightYourEdge items={research.yourEdge} />
                <WhyThisRoleBlock text={research.whyThisRole} />
                <GapsCoaching items={research.gapsToAddress} />
              </div>
            )}

            {activeTab === "prep" && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                <InterviewPrepChecklist items={research.interviewPrep} />
                <SmartQuestionsSpeech items={research.smartQuestions} />
              </div>
            )}
          </div>
        </div>
      ) : isResearching ? (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center text-center gap-5 py-12 px-4 bg-surface-secondary rounded-xl border border-dashed border-border"
        >
          {/* Stylized loader wrapper */}
          <div className="w-16 h-16 rounded-full bg-accent-muted flex items-center justify-center relative shadow-sm border border-accent/10">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
            <div className="absolute inset-0 rounded-full border-2 border-accent/30 animate-pulse pointer-events-none" />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-text-primary">
              AI Browsing Agent at Work
            </p>
            {/* Dynamic simulated step copy */}
            <p className="text-xs text-text-secondary font-medium transition-all duration-300">
              {loadingSteps[loadingStepIndex]}
            </p>
          </div>

          {/* Animated simulated progress bar */}
          <div className="w-full max-w-xs h-2 bg-border-light rounded-full overflow-hidden relative shadow-inner">
            <div
              className="h-full bg-accent transition-all duration-1000 ease-out"
              style={{
                width: `${Math.min(
                  96,
                  ((loadingStepIndex + 1) / loadingSteps.length) * 100
                )}%`,
              }}
            />
          </div>

          <p className="text-[11px] text-text-muted max-w-xs leading-relaxed">
            Crawling public documents and synthesizing interview strategy for {name}. Usually takes under a minute. Please keep this tab active.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center gap-4 py-10 px-4 rounded-xl bg-surface-secondary/40 border border-dashed border-border hover:bg-surface-secondary/60 hover:border-accent/30 transition-all duration-300 group">
          <div className="w-12 h-12 rounded-full bg-surface-secondary border border-border flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300">
            <Building2 className="w-5 h-5 text-text-secondary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-text-primary">
              Dossier Ready to Build
            </p>
            <p className="text-xs text-text-secondary max-w-sm leading-relaxed">
              Let our AI agent browse {name}&rsquo;s website to compile their tech stack, culture values, strategic role briefing, and custom interview prep pointers.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResearch}
            className="shadow-sm mt-1 bg-surface border-border hover:border-accent/40 transition-colors"
          >
            <Search className="w-3.5 h-3.5 mr-1.5 text-text-secondary group-hover:text-accent transition-colors" />
            Build Dossier
          </Button>
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
