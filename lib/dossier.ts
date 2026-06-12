import type { CompanyDossier } from "@/types";

// Forces unknown jsonb content into a string array — mirrors the defensive
// normalization in agent/matcher.ts so sloppy model output never renders badly.
function toStrings(v: unknown): string[] {
  return (Array.isArray(v) ? v : [])
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toText(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// Normalizes the jobs.company_research jsonb blob into a renderable dossier.
// Returns null when the blob isn't one (missing, malformed, or empty overview)
// — null is the "no research yet" signal for the UI. Also doubles as the
// post-synthesis normalizer in agent/researcher.ts: single source of truth for
// the dossier shape on both the write and read paths.
export function toDossier(
  value: Record<string, unknown> | null,
): CompanyDossier | null {
  if (!value || typeof value !== "object") return null;

  const dossier: CompanyDossier = {
    companyOverview: toText(value.companyOverview),
    techStack: toStrings(value.techStack),
    culture: toStrings(value.culture),
    whyThisRole: toText(value.whyThisRole),
    yourEdge: toStrings(value.yourEdge),
    gapsToAddress: toStrings(value.gapsToAddress),
    smartQuestions: toStrings(value.smartQuestions),
    interviewPrep: toStrings(value.interviewPrep),
    sources: toStrings(value.sources),
  };

  return dossier.companyOverview ? dossier : null;
}
