import { Stagehand } from "@browserbasehq/stagehand";

import { createResearchSession } from "@/lib/browserbase";
import { toDossier } from "@/lib/dossier";
import { logAgent } from "@/lib/agent-logs";
import {
  parseNimJson,
  streamNimContent,
  type NIMStreamParams,
} from "@/lib/nim-client";
import type { CompanyDossier, Job, Profile } from "@/types";

// Architecture revision (2026-06-11, after the first live run): per-page LLM
// extraction is GONE. Stagehand's extract() chunks the whole DOM through the
// model — one sub-page took 318s of inference and blew the Browserbase session
// timeout. Instead, pages are fetched as plain HTML and stripped to text in
// code (milliseconds), and the ONLY model call in the whole pipeline is the
// final 30b synthesis, which reads the raw page text directly. A headless
// browser (Browserbase, no LLM attached) is used solely as a fallback for
// JS-shell sites whose fetched HTML contains no real content.
const SYNTHESIS_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";

const MAX_SUB_PAGES = 2;
const HOMEPAGE_TEXT_CAP = 6_000; // chars — keeps the synthesis prompt small & fast
const SUB_PAGE_TEXT_CAP = 4_000;
const MIN_HOMEPAGE_TEXT = 400; // less than this → JS shell → browser fallback

// Plain-browser UA — some company sites serve bot UAs an empty page.
const FETCH_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

type PageText = { url: string; text: string };

type CompanyResearchData = {
  pages: PageText[];
  visitedUrls: string[]; // pages actually read → dossier.sources
};

// --- Homepage URL derivation -------------------------------------------------

// Strips the subdomain: jobs.stripe.com → stripe.com. Known limitation: naive
// last-two-labels misfires on two-part TLDs (.co.uk) — accepted per build plan;
// the research stage is failure-tolerant and synthesis runs regardless.
function rootDomain(hostname: string): string {
  return hostname.split(".").slice(-2).join(".");
}

// null when there's no usable company name — the caller skips web research
// entirely rather than fetching a malformed URL.
function fallbackHomepage(company: string | null): string | null {
  const slug = (company ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return slug ? `https://www.${slug}.com` : null;
}

// Follows the Adzuna redirect with a plain server-side fetch. Reality check
// from the first live run: Adzuna's redirect_url usually STAYS on adzuna.com
// (their own details page), so the www.{company}.com guess is the COMMON path,
// not the exception — which is why synthesis carries an identity guard (see
// SYNTHESIS_SYSTEM_PROMPT) against researching the wrong company.
export async function deriveHomepageUrl(
  redirectUrl: string | null,
  company: string | null,
): Promise<string | null> {
  if (!redirectUrl) return fallbackHomepage(company);
  try {
    const res = await fetch(redirectUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": FETCH_UA },
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

// --- HTML → text (no LLM, no dependencies) -----------------------------------

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Link = { url: string; label: string };

function extractLinks(html: string, baseUrl: string): Link[] {
  const links: Link[] = [];
  const re = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && links.length < 200) {
    try {
      links.push({
        url: new URL(m[1], baseUrl).toString(),
        label: htmlToText(m[2]).toLowerCase(),
      });
    } catch {
      // unparseable href — skip
    }
  }
  return links;
}

// --- Sub-page selection (plain code — build plan ranking, careers last) ------

const LINK_PRIORITY: Array<{ re: RegExp; rank: number }> = [
  { re: /about|company|who[- ]we[- ]are|mission/, rank: 0 },
  { re: /engineering|tech(nology)?|developers?/, rank: 1 },
  { re: /product|platform|solutions|services/, rank: 2 },
  { re: /blog|news|insights/, rank: 3 },
  { re: /team|people|leadership/, rank: 4 },
  { re: /careers|jobs|join/, rank: 6 },
];

function linkRank(link: Link): number {
  const hay = `${link.url.toLowerCase()} ${link.label}`;
  for (const { re, rank } of LINK_PRIORITY) {
    if (re.test(hay)) return rank;
  }
  return 99; // unranked links are never visited
}

// Trailing-slash-insensitive key so https://x.com and https://x.com/ dedupe.
function urlKey(url: string): string {
  const u = new URL(url);
  return `${u.origin}${u.pathname.replace(/\/+$/, "")}${u.search}`;
}

function pickSubPages(links: Link[], homepageUrl: string): string[] {
  const root = rootDomain(new URL(homepageUrl).hostname);
  const seen = new Set<string>([urlKey(homepageUrl)]);
  return links
    .map((l) => ({ ...l, rank: linkRank(l) }))
    .filter((l) => {
      if (l.rank > 10) return false;
      try {
        return rootDomain(new URL(l.url).hostname) === root;
      } catch {
        return false;
      }
    })
    .sort((a, b) => a.rank - b.rank)
    .filter((l) => {
      const key = urlKey(l.url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_SUB_PAGES)
    .map((l) => l.url);
}

// --- Fast path: plain fetch ----------------------------------------------------

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(8_000),
    headers: { "User-Agent": FETCH_UA, Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// Homepage + up to MAX_SUB_PAGES fetched as raw HTML; sub-pages in PARALLEL.
// Wall-clock is ~2-4s total. Returns null when the homepage yields too little
// text (JS shell / bot wall) — the signal to try the browser fallback.
async function collectViaFetch(
  homepageUrl: string,
): Promise<CompanyResearchData | null> {
  const html = await fetchHtml(homepageUrl);
  const homepageText = htmlToText(html);
  if (homepageText.length < MIN_HOMEPAGE_TEXT) return null;

  const subUrls = pickSubPages(extractLinks(html, homepageUrl), homepageUrl);
  const subPages = await Promise.all(
    subUrls.map(async (url): Promise<PageText | null> => {
      // Per-page failures are skipped — one broken page must not cost the rest.
      try {
        return { url, text: htmlToText(await fetchHtml(url)).slice(0, SUB_PAGE_TEXT_CAP) };
      } catch (error) {
        console.error(`[agent/researcher] sub-page fetch failed (${url}):`, error);
        return null;
      }
    }),
  );

  const pages: PageText[] = [
    { url: homepageUrl, text: homepageText.slice(0, HOMEPAGE_TEXT_CAP) },
    ...subPages.filter((p): p is PageText => p !== null && p.text.length > 100),
  ];
  return { pages, visitedUrls: pages.map((p) => p.url) };
}

// --- Fallback: headless browser for JS-shell sites (still no LLM) -------------

// Reads rendered text via page.evaluate — Stagehand here is ONLY a browser
// driver; no model is attached and extract() is never called, so the session
// completes in seconds regardless of model latency.
async function collectViaBrowser(
  homepageUrl: string,
): Promise<CompanyResearchData | null> {
  const session = await createResearchSession();
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey: process.env.BROWSERBASE_API_KEY!,
    browserbaseSessionID: session.id,
    verbose: 0,
    disablePino: true,
    disableAPI: true,
  });

  try {
    await stagehand.init();
    const page = stagehand.context.pages()[0];

    const readPage = async (url: string): Promise<PageText> => {
      await page.goto(url);
      const text = await page.evaluate<string>(
        "document.body ? document.body.innerText.replace(/\\s+/g, ' ').trim() : ''",
      );
      return { url, text };
    };

    const homepage = await readPage(homepageUrl);
    if (homepage.text.length < MIN_HOMEPAGE_TEXT) return null;

    const links = await page.evaluate<Array<{ url: string; label: string }>>(
      "Array.from(document.querySelectorAll('a[href]')).slice(0, 200).map(a => ({ url: a.href, label: (a.textContent || '').toLowerCase().trim() }))",
    );

    const pages: PageText[] = [
      { url: homepageUrl, text: homepage.text.slice(0, HOMEPAGE_TEXT_CAP) },
    ];
    for (const url of pickSubPages(links, homepageUrl)) {
      try {
        const p = await readPage(url);
        if (p.text.length > 100) {
          pages.push({ url, text: p.text.slice(0, SUB_PAGE_TEXT_CAP) });
        }
      } catch (error) {
        console.error(`[agent/researcher] sub-page failed (${url}):`, error);
      }
    }
    return { pages, visitedUrls: pages.map((p) => p.url) };
  } finally {
    await stagehand.close().catch(() => {});
  }
}

// Fetch-first, browser fallback. Any failure → null (synthesis-only).
async function collectCompanyResearch(
  homepageUrl: string,
): Promise<CompanyResearchData | null> {
  try {
    const viaFetch = await collectViaFetch(homepageUrl);
    if (viaFetch) return viaFetch;
  } catch (error) {
    console.error("[agent/researcher] fetch path failed:", error);
  }
  console.log("[agent/researcher] thin/blocked homepage — trying browser fallback");
  return collectViaBrowser(homepageUrl);
}

// --- NIM synthesis (the single model call in the pipeline) --------------------

// Career-strategist prompt verbatim from build-plan §13, extended with (a) the
// JSON shape and (b) an IDENTITY GUARD: the homepage is often a domain GUESS
// (Adzuna redirects rarely reach the employer site), so the model must discard
// research that clearly belongs to a different company — first live run
// researched a furniture maker for a trading-systems job.
const SYNTHESIS_SYSTEM_PROMPT = `You are a sharp career strategist preparing a candidate to apply for a specific role.
You are given (a) research collected from the company's own website, (b) the job posting,
and (c) the candidate's profile. Produce a concise, concrete briefing that gives this
specific candidate an edge for this specific role.

Rules:
- Ground every company claim in the provided research or job posting. Never invent
  funding, customers, headcount, or facts. If research was thin, infer carefully from
  the job posting and say what's inferred.
- IDENTITY CHECK: the website research may have been collected from the WRONG company
  (the URL is sometimes a guess from the company name). If the website content clearly
  describes a different company than the job posting (different industry, products, or
  business), set "usedWebsiteResearch" to false and ignore the website content entirely —
  ground everything in the job posting alone. Otherwise set it to true.
- Be specific to THIS candidate. Connect their actual skills and past work to this
  company's stack, product, and values. No generic advice that would apply to anyone.
- Turn the candidate's missing skills into a strategy: how to frame the gap honestly
  and what adjacent experience to lean on.
- Talking points and questions must reference real things from the research, the kind
  of detail that signals the candidate did their homework.
- Keep every item tight: one or two sentences. No fluff.

Return ONLY valid JSON matching this exact shape:
{
  "usedWebsiteResearch": boolean,
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
    ? research.pages
        .map((p) => `PAGE: ${p.url}\n${p.text}`)
        .join("\n\n---\n\n")
    : "No website research available — infer carefully from the job posting.";

  return `COMPANY RESEARCH (raw text from the company's website):
${companyResearch}

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
  const parsed = parseNimJson(content) as Record<string, unknown>;
  const dossier = toDossier(parsed);
  if (!dossier) throw new Error("Synthesis returned an empty dossier.");

  // Sources are what we actually read — never model output. When the model's
  // identity check rejected the website content (wrong company), cite nothing.
  dossier.sources =
    parsed.usedWebsiteResearch === false ? [] : (research?.visitedUrls ?? []);
  return dossier;
}

// --- Public entry --------------------------------------------------------------

// Always produce a dossier: a fetch/browser failure degrades to synthesis-only
// (job posting + profile), never an error. Only a double synthesis failure
// returns { success: false } — and that leaves an agent_logs error row so the
// failure is visible in the DB, not just the server console.
export async function researchCompany(
  job: Job,
  profile: Profile,
  userId: string,
): Promise<{ success: boolean; data?: CompanyDossier; error?: string }> {
  let research: CompanyResearchData | null = null;
  try {
    const homepageUrl = await deriveHomepageUrl(job.source_url, job.company);
    if (homepageUrl) {
      research = await collectCompanyResearch(homepageUrl);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[agent/researcher] website research failed:", msg);
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
      void logAgent({
        runId: job.run_id,
        userId,
        jobId: job.id,
        level: "error",
        message: `Company research for ${job.company ?? "company"} failed — dossier could not be generated`,
      });
      return {
        success: false,
        error: "Failed to build the company dossier. Please try again.",
      };
    }
  }
}
