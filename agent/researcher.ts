import { z } from "zod";
import { Stagehand } from "@browserbasehq/stagehand";

import { createResearchSession } from "@/lib/browserbase";
import { toDossier } from "@/lib/dossier";
import { logAgent } from "@/lib/agent-logs";
import { streamNimContent, type NIMStreamParams } from "@/lib/nim-client";
import type { CompanyDossier, Job, Profile } from "@/types";

// Model split (decided 2026-06-11): Stagehand's internal extraction calls run
// on the non-reasoning nano model — its thinking is disabled via /no_think in
// the system prompt, so Stagehand always sees clean content (the 30b reasoning
// model leaks reasoning into content on this transport — verified live).
// The 30b stays on the final dossier synthesis, where quality matters most and
// our own nim-client handles the reasoning params.
// "groq/" prefix — verified live (2026-06-11): Stagehand routes it to the AI
// SDK's OpenAI-COMPATIBLE chat-completions client AND passes structuredOutputs
// (response_format json_schema, which NIM honors — keys come back exactly per
// schema). "openai/" is wrong here: it targets the /v1/responses API (404 on
// NIM); "togetherai/" hits the right endpoint but sends no schema constraint,
// so the model invents key names. The remainder after the prefix is the model
// id sent to NIM.
const STAGEHAND_MODEL = "groq/nvidia/nvidia-nemotron-nano-9b-v2";
const SYNTHESIS_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";

const MAX_SUB_PAGES = 3;

// --- Extraction schemas (verbatim from build-plan §13) ----------------------

const homepageSchema = z.object({
  oneLiner: z.string().describe("What the company does in one sentence"),
  productSummary: z.string().describe("What they build/sell and who it's for"),
  signals: z
    .array(z.string())
    .describe("Funding, notable customers, scale, mission, recent news"),
  pageLinks: z
    .array(
      z.object({
        url: z.string(),
        kind: z.enum([
          "about",
          "careers",
          "blog",
          "engineering",
          "product",
          "team",
          "other",
        ]),
      }),
    )
    .describe("Internal links worth visiting"),
});

const subPageSchema = z.object({
  keyPoints: z.array(z.string()),
  technologies: z
    .array(z.string())
    .describe("Specific languages, frameworks, tools, platforms"),
  valuesOrCulture: z
    .array(z.string())
    .describe("Stated values, working style, team norms"),
  notable: z
    .array(z.string())
    .describe("Customers, funding, scale, projects, awards"),
});

const HOMEPAGE_INSTRUCTION =
  "This is a company's homepage. Capture what the company actually does, who it's for, and any concrete signals (funding, customers, scale, mission, recent launches). Then find the internal links most worth visiting to research them as an employer.";

const SUB_PAGE_INSTRUCTION =
  "Extract substance that helps a candidate understand this company before applying: what they do, their values and how they work, the specific technologies and tools they use, notable projects or customers, and how the team operates. Ignore nav, footers, cookie banners, and generic marketing copy.";

type HomepageData = z.infer<typeof homepageSchema>;
type SubPageData = z.infer<typeof subPageSchema>;

type CompanyResearchData = {
  homepage: Omit<HomepageData, "pageLinks">;
  pages: Array<{ url: string } & SubPageData>;
  visitedUrls: string[]; // homepage + sub-pages actually reached → dossier.sources
};

// --- Homepage URL derivation -------------------------------------------------

// Strips the subdomain: jobs.stripe.com → stripe.com. Known limitation: naive
// last-two-labels misfires on two-part TLDs (.co.uk) — accepted per build plan;
// the browser stage is failure-tolerant and synthesis runs regardless.
function rootDomain(hostname: string): string {
  return hostname.split(".").slice(-2).join(".");
}

// null when there's no usable company name — the caller skips the browser
// stage entirely rather than opening a session against a malformed URL.
function fallbackHomepage(company: string | null): string | null {
  const slug = (company ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return slug ? `https://www.${slug}.com` : null;
}

// Follows the Adzuna redirect with a plain server-side fetch — no browser
// needed for this step. Falls back to https://www.{company}.com when the
// redirect never leaves adzuna.com, the URL is missing, or the fetch fails;
// null when no homepage can be derived at all (→ synthesis-only).
export async function deriveHomepageUrl(
  redirectUrl: string | null,
  company: string | null,
): Promise<string | null> {
  if (!redirectUrl) return fallbackHomepage(company);
  try {
    const res = await fetch(redirectUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    const finalUrl = new URL(res.url);
    if (finalUrl.hostname.includes("adzuna.com")) {
      return fallbackHomepage(company);
    }
    return `https://${rootDomain(finalUrl.hostname)}`;
  } catch (error) {
    console.error("[agent/researcher] redirect follow failed:", error);
    return fallbackHomepage(company);
  }
}

// --- Browser research (single Browserbase session) ---------------------------

// Lower rank = visited first. Substance pages beat careers (build plan: prefer
// about/blog/engineering/product over careers).
const KIND_RANK: Record<HomepageData["pageLinks"][number]["kind"], number> = {
  about: 0,
  engineering: 1,
  product: 2,
  blog: 3,
  team: 4,
  other: 5,
  careers: 6,
};

// Trailing-slash/hash-insensitive key so https://x.com and https://x.com/
// dedupe to one visit.
function urlKey(url: string): string {
  const u = new URL(url);
  return `${u.origin}${u.pathname.replace(/\/+$/, "")}${u.search}`;
}

function pickSubPages(
  links: HomepageData["pageLinks"],
  homepageUrl: string,
): string[] {
  const root = rootDomain(new URL(homepageUrl).hostname);
  const seen = new Set<string>([urlKey(homepageUrl)]);
  return links
    .filter((l) => {
      try {
        return rootDomain(new URL(l.url, homepageUrl).hostname) === root;
      } catch {
        return false;
      }
    })
    .sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind])
    .map((l) => new URL(l.url, homepageUrl).toString())
    .filter((url) => {
      const key = urlKey(url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_SUB_PAGES);
}

// Opens ONE Browserbase session, extracts the homepage, then up to 3 sub-pages.
// Returns null when the homepage yields nothing meaningful (the signal to skip
// browser research and synthesize from job description + profile only). The
// session is always closed in finally — and before NIM synthesis ever runs.
async function collectCompanyResearch(
  homepageUrl: string,
): Promise<CompanyResearchData | null> {
  const session = await createResearchSession();
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey: process.env.BROWSERBASE_API_KEY!,
    browserbaseSessionID: session.id,
    model: {
      modelName: STAGEHAND_MODEL,
      apiKey: process.env.NIM_API_KEY!,
      baseURL: "https://integrate.api.nvidia.com/v1",
    },
    systemPrompt: "/no_think", // nano-9b-v2: disable thinking inside Stagehand's calls
    verbose: 0,
    disablePino: true,
    // Custom OpenAI-compatible endpoints (NIM) require local LLM execution —
    // Stagehand's hosted API can't forward to a custom baseURL (404s).
    disableAPI: true,
  });

  try {
    await stagehand.init();
    const page = stagehand.context.pages()[0];

    await page.goto(homepageUrl);
    const homepage = await stagehand.extract(
      HOMEPAGE_INSTRUCTION,
      homepageSchema,
    );

    if (!homepage.oneLiner && !homepage.productSummary) return null;

    const pages: CompanyResearchData["pages"] = [];
    const visitedUrls = [homepageUrl];
    for (const url of pickSubPages(homepage.pageLinks, homepageUrl)) {
      // Per-page failures are logged and skipped — one broken page must not
      // cost the rest of the research.
      try {
        await page.goto(url);
        const data = await stagehand.extract(SUB_PAGE_INSTRUCTION, subPageSchema);
        pages.push({ url, ...data });
        visitedUrls.push(url);
      } catch (error) {
        console.error(`[agent/researcher] sub-page failed (${url}):`, error);
      }
    }

    return {
      homepage: {
        oneLiner: homepage.oneLiner,
        productSummary: homepage.productSummary,
        signals: homepage.signals,
      },
      pages,
      visitedUrls,
    };
  } finally {
    await stagehand.close().catch(() => {});
  }
}

// --- NIM synthesis ------------------------------------------------------------

// Verbatim from build-plan §13.
const SYNTHESIS_SYSTEM_PROMPT = `You are a sharp career strategist preparing a candidate to apply for a specific role.
You are given (a) research collected from the company's own website, (b) the job posting,
and (c) the candidate's profile. Produce a concise, concrete briefing that gives this
specific candidate an edge for this specific role.

Rules:
- Ground every company claim in the provided research or job posting. Never invent
  funding, customers, headcount, or facts. If research was thin, infer carefully from
  the job posting and say what's inferred.
- Be specific to THIS candidate. Connect their actual skills and past work to this
  company's stack, product, and values. No generic advice that would apply to anyone.
- Turn the candidate's missing skills into a strategy: how to frame the gap honestly
  and what adjacent experience to lean on.
- Talking points and questions must reference real things from the research, the kind
  of detail that signals the candidate did their homework.
- Keep every item tight: one or two sentences. No fluff.

Return ONLY valid JSON matching this exact shape:
{
  "companyOverview": "string",
  "techStack": ["string"],
  "culture": ["string"],
  "whyThisRole": "string",
  "yourEdge": ["string"],
  "gapsToAddress": ["string"],
  "smartQuestions": ["string"],
  "interviewPrep": ["string"]
}`;

function buildSynthesisPrompt(
  research: CompanyResearchData | null,
  job: Job,
  profile: Profile,
): string {
  const companyResearch = research
    ? JSON.stringify(
        { homepage: research.homepage, pages: research.pages },
        null,
        2,
      )
    : "No website research available — infer carefully from the job posting.";

  return `COMPANY RESEARCH (from their website): ${companyResearch}

JOB POSTING:
Title: ${job.title ?? "Not specified"}
Company: ${job.company ?? "Not specified"}
Description: ${job.about_role ?? "Not provided"}
Matched skills (candidate has): ${job.matched_skills.join(", ") || "None recorded"}
Missing skills (candidate lacks): ${job.missing_skills.join(", ") || "None recorded"}

CANDIDATE PROFILE:
Current Title: ${profile.current_title || "Not specified"}
Years of Experience: ${profile.years_experience || "Not specified"}
Experience Level: ${profile.experience_level || "Not specified"}
Skills: ${profile.skills?.join(", ") || "None listed"}
Work Experience: ${JSON.stringify(profile.work_experience ?? [])}`;
}

// One synthesis attempt: stream, parse, normalize. Throws on bad JSON/empty
// dossier so the caller can retry once.
async function synthesizeOnce(
  research: CompanyResearchData | null,
  job: Job,
  profile: Profile,
): Promise<CompanyDossier> {
  const params: NIMStreamParams = {
    model: SYNTHESIS_MODEL,
    messages: [
      { role: "system", content: SYNTHESIS_SYSTEM_PROMPT },
      { role: "user", content: buildSynthesisPrompt(research, job, profile) },
    ],
    temperature: 0.4,
    top_p: 0.95,
    max_tokens: 4096,
    reasoning_budget: 1024,
    chat_template_kwargs: { enable_thinking: true },
    stream: true,
  };

  const content = await streamNimContent(params);
  const dossier = toDossier(JSON.parse(content) as Record<string, unknown>);
  if (!dossier) throw new Error("Synthesis returned an empty dossier.");

  // Sources are what we actually visited — never model output, so the dossier
  // can't cite a URL the agent never opened.
  dossier.sources = research?.visitedUrls ?? [];
  return dossier;
}

// --- Public entry --------------------------------------------------------------

// Always produce a dossier: a browser/Browserbase failure degrades to
// synthesis-only (job description + profile), never an error. Only a double
// synthesis failure returns { success: false }.
export async function researchCompany(
  job: Job,
  profile: Profile,
  userId: string,
): Promise<{ success: boolean; data?: CompanyDossier; error?: string }> {
  let research: CompanyResearchData | null = null;
  try {
    const homepageUrl = await deriveHomepageUrl(job.source_url, job.company);
    // No derivable homepage → don't open a browser session at all; synthesize
    // from the job posting + profile alone.
    if (homepageUrl) {
      research = await collectCompanyResearch(homepageUrl);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[agent/researcher] browser research failed:", msg);
    void logAgent({
      runId: job.run_id,
      userId,
      jobId: job.id,
      level: "warning",
      message: `Website research for ${job.company ?? "company"} failed — building dossier from the job posting instead`,
    });
  }

  try {
    return { success: true, data: await synthesizeOnce(research, job, profile) };
  } catch (firstError) {
    console.error("[agent/researcher] synthesis attempt 1:", firstError);
    try {
      return {
        success: true,
        data: await synthesizeOnce(research, job, profile),
      };
    } catch (secondError) {
      const msg =
        secondError instanceof Error
          ? secondError.message
          : String(secondError);
      console.error("[agent/researcher] synthesis attempt 2:", msg);
      return {
        success: false,
        error: "Failed to build the company dossier. Please try again.",
      };
    }
  }
}
