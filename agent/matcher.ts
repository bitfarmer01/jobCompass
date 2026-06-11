import { streamNimContent, type NIMStreamParams } from "@/lib/nim-client";
import type { AdzunaJob } from "@/lib/adzuna";
import type { JobScore, Profile } from "@/types";

// Decision (2026-06-11): scoring quality is the product's core value, so the
// 30b reasoning model (same as the extractor) is used here. Per-job calls run
// concurrently from agent/adzuna.ts, which amortizes the slower per-call latency.
const NIM_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";

// --- Deterministic keyword layer -------------------------------------------
// Scoring revision (2026-06-11): an exact keyword match is cheap, stable, and
// repeatable, so it runs FIRST. The semantic (LLM) scorer is the fallback — it
// only "comes into play" when the keyword evidence is inconclusive. This keeps
// the common case deterministic (no run-to-run drift on the numbers the UI
// sorts/filters by) and reserves the reasoning model for genuinely ambiguous
// jobs (synonyms, seniority, skills phrased differently).

// A confident keyword match is title-aligned and names >= 1 of the candidate's
// skills. Score = title base + per-matched-skill evidence. A coverage RATIO is
// deliberately NOT used: Adzuna search returns a one-line snippet that lists
// only a couple of skills, so a ratio over ALL the candidate's skills would
// punish well-matched jobs. Absolute evidence keeps these (correctly) >= 70.
const KEYWORD_TITLE_BASE = 60;
const KEYWORD_SKILL_POINTS = 12;
const KEYWORD_SKILL_CAP = 40;

// True when `term` appears in `haystack` as a standalone token. Boundaries are
// "not a letter/digit" (not \b) so symbol-bearing skills — C++, C#, .NET,
// Node.js — match correctly; the term is regex-escaped first. The caller passes
// an already-lowercased haystack; the term is lowercased here.
function keywordHit(haystack: string, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return false;
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`).test(haystack);
}

// Attempts a deterministic score. Returns null when the match is NOT an exact
// keyword match (no skills to match on, no title alignment, or no skill keyword
// present in the listing) — that null is the signal to fall back to the LLM.
export function keywordScore(
  job: AdzunaJob,
  profile: Profile,
  searchedTitle?: string,
): JobScore | null {
  const skills = (profile.skills ?? []).map((s) => s.trim()).filter(Boolean);
  if (skills.length === 0) return null; // nothing to match on → let the LLM judge

  const titleHay = (job.title ?? "").toLowerCase();
  const listingHay = `${job.title ?? ""} ${job.description ?? ""}`.toLowerCase();

  // Sought titles = the title the user searched + their target titles.
  const soughtTitles = [searchedTitle ?? "", ...(profile.job_titles_seeking ?? [])]
    .map((t) => t.trim())
    .filter(Boolean);
  const titleAligned = soughtTitles.some((t) => keywordHit(titleHay, t));
  if (!titleAligned) return null; // role isn't clearly what they want → LLM

  const matchedSkills = skills.filter((s) => keywordHit(listingHay, s));
  if (matchedSkills.length === 0) return null; // no exact skill hit → LLM

  const matchScore = Math.min(
    100,
    KEYWORD_TITLE_BASE +
      Math.min(KEYWORD_SKILL_CAP, matchedSkills.length * KEYWORD_SKILL_POINTS),
  );

  return {
    matchScore,
    matchReason:
      `Exact keyword match — this role's title aligns with the titles you're ` +
      `targeting and the listing names ${matchedSkills.length} of your ` +
      `skills (${matchedSkills.join(", ")}). Scored deterministically without AI.`,
    matchedSkills,
    // Unknowable from a search snippet without the full job description — left
    // empty rather than guessed. The LLM path fills this in when it runs.
    missingSkills: [],
  };
}

// --- Public entry: keyword first, LLM fallback -----------------------------
export async function scoreJob(
  job: AdzunaJob,
  profile: Profile,
  searchedTitle?: string,
): Promise<{ success: boolean; data?: JobScore; error?: string }> {
  const deterministic = keywordScore(job, profile, searchedTitle);
  if (deterministic) return { success: true, data: deterministic };
  return scoreJobWithLLM(job, profile);
}

// --- Semantic (LLM) fallback ------------------------------------------------
const SYSTEM_PROMPT = `You are a precise job-match analyst. Score how well a job listing matches a candidate's profile.

Return ONLY valid JSON — no markdown, no code fences, no explanation. The JSON must match this exact shape:
{
  "matchScore": integer 0-100 (100 = perfect fit; weigh skill overlap, title alignment, and experience level),
  "matchReason": string (one concise paragraph explaining the score — concrete, references actual skills and the role),
  "matchedSkills": string[] (skills the candidate has that this job requires),
  "missingSkills": string[] (skills this job requires that the candidate lacks)
}

Rules:
- The job description is a short snippet — score from what it states or clearly implies; never invent requirements
- matchedSkills must only contain skills actually present in the candidate's profile
- missingSkills must only contain skills the job mentions that are absent from the profile
- Use empty array [] when nothing qualifies
- Return exactly one JSON object — no other text whatsoever`;

async function scoreJobWithLLM(
  job: AdzunaJob,
  profile: Profile,
): Promise<{ success: boolean; data?: JobScore; error?: string }> {
  const userPrompt = `Job listing:
Title: ${job.title}
Company: ${job.company.display_name}
Location: ${job.location.display_name}
Description (snippet): ${job.description}

Candidate profile:
Current Title: ${profile.current_title || "Not specified"}
Experience Level: ${profile.experience_level || "Not specified"}
Years of Experience: ${profile.years_experience || "Not specified"}
Skills: ${profile.skills?.join(", ") || "None listed"}
Industries: ${profile.industries?.join(", ") || "None listed"}
Titles Seeking: ${profile.job_titles_seeking?.join(", ") || "None listed"}`;

  try {
    const params: NIMStreamParams = {
      model: NIM_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      top_p: 0.95,
      max_tokens: 4096,
      reasoning_budget: 1024,
      chat_template_kwargs: { enable_thinking: true },
      stream: true,
    };

    const content = await streamNimContent(params);
    const parsed = JSON.parse(content) as JobScore;

    // Defensive normalization — clamp the score to a 0-100 integer and force
    // arrays so a sloppy model output never produces an unrenderable job row.
    const toSkills = (v: unknown) =>
      (Array.isArray(v) ? v : [])
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter(Boolean);
    const data: JobScore = {
      matchScore: Math.min(100, Math.max(0, Math.round(Number(parsed.matchScore) || 0))),
      matchReason: typeof parsed.matchReason === "string" ? parsed.matchReason.trim() : "",
      matchedSkills: toSkills(parsed.matchedSkills),
      missingSkills: toSkills(parsed.missingSkills),
    };
    return { success: true, data };
  } catch (error) {
    // Log the raw error server-side; never surface provider/parse internals to the user.
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[agent/matcher]", msg);
    return {
      success: false,
      error: "Failed to score job against profile.",
    };
  }
}
