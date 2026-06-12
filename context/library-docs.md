# Library Docs

Project-specific usage patterns for every third party library in this project. This file only covers how we use each library in this specific project — rules, patterns, and constraints specific to JobCompass.

Read the relevant section before implementing any feature that touches these libraries.

---

## Before Using Any Library

Before implementing any feature that uses a third party library:

1. **Check AGENTS.md** at the project root — it lists every skill installed for this project and how to use them. Skills contain up-to-date API documentation, usage patterns, and best practices specific to this codebase.

2. **Check if an MCP server is configured** for that library. Some tools have MCP servers that give the AI agent direct access to documentation, logs, and debugging tools. If an MCP server is available — use it before falling back to general knowledge.

3. **Read this file** for project-specific patterns that override general library knowledge.

The order of authority is:

```
MCP server (real-time docs) → Skills via AGENTS.md → This file (project rules) → General training knowledge
```

Never rely on general training knowledge alone for library APIs — they change frequently and training data may be outdated.

---

## InsForge

**Check first:** Check AGENTS.md for an installed InsForge skill. If an InsForge MCP server is configured — use it. The skill/MCP will have the latest API patterns.

### Client vs Server

Two separate instances — never mix them:

```typescript
// lib/insforge-client.ts — browser context only
import { createBrowserClient } from "@insforge/ssr";

export const insforge = createBrowserClient(
  process.env.NEXT_PUBLIC_INSFORGE_URL!,
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
);
```

```typescript
// lib/insforge-server.ts — server context only
import { createServerClient } from "@insforge/ssr";
import { cookies } from "next/headers";

export const createInsforgeServer = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_INSFORGE_URL!,
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
};
```

**Rules:**

- Browser client — Client Components, browser-side auth state, realtime subscriptions
- Server client — Server Components, API routes, Server Actions, agent functions
- Never use browser client in server context
- Never use server client in browser context

---

### Auth

```typescript
// Get current user in server context
const insforge = await createInsforgeServer();
const {
  data: { user },
  error,
} = await insforge.auth.getUser();
if (!user) redirect("/login");
```

---

### DB Queries

```typescript
// Read
const { data, error } = await insforge
  .from("jobs")
  .select("*")
  .eq("user_id", user.id)
  .order("found_at", { ascending: false });

// Insert
const { data, error } = await insforge
  .from("jobs")
  .insert({ user_id: user.id, title, company, match_score })
  .select()
  .single();

// Update
const { error } = await insforge
  .from("jobs")
  .update({ company_research: dossier })
  .eq("id", jobId)
  .eq("user_id", user.id); // always scope to user
```

**Rules:**

- Always scope queries to `user_id` — never query without user filter
- Always handle the `error` return — never assume success
- Use `.single()` when expecting exactly one row

---

### Table grants & RLS (read before creating any table)

InsForge follows the PostgREST/Supabase model. When you create a table via `run-raw-sql`:

- It **auto-grants both `anon` and `authenticated` full CRUD** (`ALTER DEFAULT PRIVILEGES` is
  configured at the role level). The table grants are **not** the security boundary.
- **RLS is the security gate.** Every table holding user data MUST: `ENABLE ROW LEVEL SECURITY`
  and have an owner policy — `FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK
  (user_id = auth.uid())` (use `id = auth.uid()` on the `profiles` table). With RLS on and no
  `anon` policy, the anon role is default-denied (zero rows) even though it holds table grants.
- `auth.uid()` returns the authenticated user's id (JWT `sub`). The SDK runs as the
  `authenticated` role under a user JWT; `run-raw-sql` runs as `project_admin`, which **bypasses
  RLS** — so RLS behavior can only be verified end-to-end under a real user session, not via MCP.
- **For user-private tables, additionally `REVOKE` the `anon` grant** as defense-in-depth:
  `REVOKE SELECT, INSERT, UPDATE, DELETE ON public.<table> FROM anon;` (done for the feature-04
  tables). Do **not** alter the global default privileges to strip `anon` — that would break any
  future intentionally-public/anon-readable table.

**Filter operators (db SDK):** the documented filters are `.eq/.neq/.gt/.gte/.lt/.lte/.like/
.ilike/.in/.is`. For null checks the SDK documents only `.is(col, null)` (IS NULL) — there is
**no documented inverse** (`.not(...)` is a postgrest-js method but undocumented for InsForge and
unused in this codebase). To get "IS NOT NULL", either select the column and filter in code
(see `lib/activity.ts` — fine for small user-scoped sets) or rely on `.is`/code rather than
`.not`.

---

### Storage

**⚠️ The installed SDK is v1.3.1 — the real storage API differs from older docs.**
Verified against `node_modules/@insforge/sdk/dist/client-*.d.ts`:

```typescript
// upload(path, file) — takes File | Blob ONLY. No options object,
// no contentType, NO upsert flag.
const { data, error } = await insforge.storage
  .from("resumes")
  .upload(`${userId}/resume.pdf`, file); // file: File | Blob
// data → { bucket, key, size, mimeType, uploadedAt, url }

// getPublicUrl(path) returns the string DIRECTLY (not { data: { publicUrl } }).
const url: string = insforge.storage.from("resumes").getPublicUrl(path);

// download(path) — server-side fetch of the bytes (use this to serve a
// PRIVATE bucket through an authenticated route instead of a public URL).
const { data: blob, error } = await insforge.storage
  .from("resumes")
  .download(path); // data: Blob | null

// remove(path) — delete. There is NO upsert on upload, so to overwrite a
// fixed path you remove() then upload() (or use uploadAuto for unique keys).
await insforge.storage.from("resumes").remove(path);
```

**There is NO `createSignedUrl()` in v1.3.1.** A private bucket therefore can't be
read via a signed URL — serve it through an authenticated API route that calls
`download()` server-side, or use a public bucket + `getPublicUrl()` (world-readable).

**Storage paths:**

- Base resume: `resumes/{user_id}/resume.pdf`

**Rules:**

- No `upsert` option — overwriting the base resume goes through `overwriteResume()` in `lib/resume-storage.ts` (guarded `remove()` — it THROWS when the file doesn't exist — then `upload()`). Never hand-roll remove+upload at a call site.
- Bucket name + path come from `RESUME_BUCKET` / `resumePath(userId)` in `lib/resume-storage.ts` — never hardcode `"resumes"` or `` `${userId}/resume.pdf` `` in routes/actions
- `upload()` accepts only `File | Blob` — a server-generated PDF Buffer must be wrapped (`new Blob([new Uint8Array(buffer)], { type: "application/pdf" })`)
- Save the returned URL/path back to the DB after upload
- Never write files to disk — always upload the Blob directly to storage

> **✅ RESOLVED (feature 06) — resumes bucket is PRIVATE.**
> Created via MCP `create-bucket` with `isPublic: false`. Because the path
> `resumes/{user_id}/resume.pdf` is guessable and the SDK has **no `createSignedUrl()`**,
> a public bucket was rejected (PII leak). Instead:
> - **Write:** `uploadResume(formData)` in `actions/profile.ts` — validates PDF (≤5 MB),
>   `remove()`s then `upload()`s to `{userId}/resume.pdf` (no `upsert` in SDK), and saves the
>   storage **path** (not a URL) to `profiles.resume_pdf_url`.
> - **Read:** the authenticated **`GET /api/resume`** route derives the path from the session
>   and streams `storage.download()` as `application/pdf` — a user can only ever fetch their
>   own file. There is no public URL.
> - Features 07 (extract) and 08 (generate) read/write the same `{userId}/resume.pdf` path
>   server-side via `download()` / `remove()`+`upload()`.

---

## Adzuna API

**Check first:** Check AGENTS.md for an installed Adzuna skill. If none exists — use this file and the official Adzuna API docs.

### Job Search

```typescript
// lib/adzuna.ts
export async function searchJobs(
  jobTitle: string,
  location: string,
  country: string = "us",
): Promise<AdzunaJob[]> {
  const params = new URLSearchParams({
    app_id: process.env.ADZUNA_ID!,
    app_key: process.env.ADZUNA_API_KEY!,
    what: jobTitle,
    category: "it-jobs", // always filter to IT jobs
    results_per_page: "10",
    "content-type": "application/json",
  });

  // Only add where if location is provided
  if (location) {
    params.set("where", location);
  }

  const response = await fetch(
    `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`,
  );

  if (!response.ok) {
    throw new Error(`Adzuna API error: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}
```

### Response Shape

Each Adzuna job result contains:

```typescript
type AdzunaJob = {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string; // snippet only — not full description
  redirect_url: string; // Adzuna tracking URL → redirects to actual job
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted: "0" | "1"; // "1" means salary is estimated
  contract_type?: string;
  created: string; // ISO date string
  category: { tag: string; label: string };
};
```

### Saving Jobs to DB

```typescript
// Map Adzuna result to jobs table
const jobRecord = {
  user_id: userId,
  run_id: runId,
  source: "search", // always 'search' for Adzuna jobs
  source_url: job.redirect_url,
  external_apply_url: job.redirect_url,
  title: job.title,
  company: job.company.display_name,
  location: job.location.display_name,
  salary: job.salary_min
    ? `$${Math.round(job.salary_min / 1000)}k - $${Math.round(job.salary_max! / 1000)}k`
    : null,
  job_type: job.contract_type || "fulltime",
  about_role: job.description, // Adzuna returns snippet — used as description
  match_score: scoredJob.matchScore,
  match_reason: scoredJob.matchReason,
  matched_skills: scoredJob.matchedSkills,
  missing_skills: scoredJob.missingSkills,
  found_at: new Date().toISOString(),
};
```

**Rules:**

- Always include `category=it-jobs` — never search Adzuna without this filter
- Never pass `where` if location is empty — omit the parameter entirely
- `source` is always `'search'` for Adzuna jobs — never any other value
- `salary_is_predicted: "1"` means Adzuna estimated the salary — this is normal
- Adzuna description is a snippet — the NIM matcher scores from it, not a full description
- Default country to `'us'` — support `gb`, `au`, `ca` as alternatives

---

## Browserbase

**Check first:** Check AGENTS.md for an installed Browserbase skill. If a Browserbase MCP server is configured — use it. The skill/MCP will have the latest session management and API patterns.

### Session Creation — Company Research

```typescript
import Browserbase from "@browserbasehq/sdk";

const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });

// Single session for company research — sequential page visits
const session = await bb.sessions.create({
  projectId: process.env.BROWSERBASE_PROJECT_ID!,
  timeout: 120, // 2 minute session — visits 3-4 pages max
});
```

**Important — Browserbase runs independently from your Next.js server:**
Browserbase sessions run on Browserbase's cloud infrastructure, not inside your Next.js API route. The API route triggers the Browserbase session and returns a response while the session continues running independently on Browserbase's platform. Do not add `maxDuration` or any timeout configuration to Next.js API routes to accommodate Browserbase session length.

**Rules:**

- Always use single sessions — never parallel sessions (free plan limit)
- Session timeout is 300 seconds — 120s proved too short in the first live run; an
  idle-after-close session costs nothing, so leave headroom
- **The browser is the FALLBACK, not the default** (revised 2026-06-11): company research
  fetches pages as plain HTML server-side and strips them to text in code — a Browserbase
  session is opened only when the fetched homepage is a JS shell (<400 chars of text). In the
  fallback the page is read via `page.evaluate` (document.body.innerText) — `extract()` is
  NOT used (its DOM chunking through the LLM took 318s for one page on NIM)
- Always end sessions cleanly — call stagehand.close() when done
- Project ID always from `process.env.BROWSERBASE_PROJECT_ID` — never hardcode
- Browserbase client lives in `lib/browserbase.ts` — always import from there

---

## Stagehand

**Check first:** Check AGENTS.md for an installed Stagehand skill. If a Stagehand MCP server is configured — use it. The skill/MCP will have the latest act() and extract() patterns.

### Initialisation (Stagehand v3 — VERIFIED LIVE 2026-06-11, feature 13)

The config below was verified end-to-end against `@browserbasehq/stagehand@3.5.0` and a real
Browserbase session + NIM extraction. Three hard-won facts — do not regress them:

1. **`disableAPI: true` is REQUIRED with a custom model endpoint.** By default Stagehand v3
   proxies LLM calls through its own hosted API, which cannot reach a custom `baseURL` (404s).
   `disableAPI: true` runs the LLM calls locally via the AI SDK.
2. **The model prefix must be `groq/`, not `openai/` or `togetherai/`.** The prefix picks the
   AI SDK sub-provider: `openai/` targets the OpenAI *Responses* API (`/v1/responses` — NIM
   doesn't implement it, 404); `togetherai/` hits the right `/chat/completions` endpoint but
   sends NO schema constraint (model invents JSON key names → AI_NoObjectGeneratedError);
   `groq/` is OpenAI-compatible chat-completions AND Stagehand passes `structuredOutputs: true`
   for it (response_format json_schema, which NIM honors). The rest of the string after the
   prefix is the model id sent to NIM.
3. **Use the non-reasoning nano model for Stagehand** (`nvidia/nvidia-nemotron-nano-9b-v2`
   with `/no_think` via `systemPrompt`). The 30b reasoning model leaks its reasoning into
   `content` on this transport and fails extraction parsing (verified live). The 30b stays on
   dossier synthesis via `lib/nim-client.ts`, where reasoning params are handled.

Also: v3 has no top-level session-bound `projectId` requirement when `browserbaseSessionID` is
passed — create the session via `lib/browserbase.ts` and hand the id over. `extract()` takes
POSITIONAL args. The page handle comes from `stagehand.context.pages()[0]`.

```typescript
import { Stagehand } from "@browserbasehq/stagehand";
import { createResearchSession } from "@/lib/browserbase";

const session = await createResearchSession();
const stagehand = new Stagehand({
  env: "BROWSERBASE",
  apiKey: process.env.BROWSERBASE_API_KEY!,
  browserbaseSessionID: session.id,
  model: {
    modelName: "groq/nvidia/nvidia-nemotron-nano-9b-v2", // groq/ = OpenAI-compatible + structured outputs
    apiKey: process.env.NIM_API_KEY!,
    baseURL: "https://integrate.api.nvidia.com/v1",
  },
  systemPrompt: "/no_think", // disable nano-9b thinking inside Stagehand's calls
  verbose: 0,
  disablePino: true,
  disableAPI: true, // REQUIRED: custom baseURL only works with local LLM execution
});

await stagehand.init();
const page = stagehand.context.pages()[0];
await page.goto(url);
```

### extract() — positional args in v3 (NOT an options object)

```typescript
import { z } from "zod";

const result = await stagehand.extract(
  "Extract the company overview, main product description, and any technology mentions from this page.",
  z.object({
    companyOverview: z.string().optional(),
    mainProduct: z.string().optional(),
    techMentions: z.array(z.string()).optional(),
  }),
);
```

### act()

```typescript
// Always wrap in try/catch
try {
  await stagehand.act("Click the About link in the navigation");
} catch (error) {
  await logAgentError(jobId, null, error);
}
```

## Company Research Section

Replace the existing Stagehand "Company Research Pattern" section in library-docs.md with this:

---

### Company Research Pattern

Three-step process: homepage extraction → sub-page extraction → NIM synthesis.
Job description and user profile come from DB — never re-fetch what you already have.
Browser's only job is the company website.

```typescript
// Step 1 — Homepage extraction
const homepageData = await stagehand.extract({
  instruction:
    "This is a company's homepage. Capture what the company actually does, who it's for, and any concrete signals (funding, customers, scale, mission, recent launches). Then find the internal links most worth visiting to research them as an employer.",
  schema: z.object({
    oneLiner: z.string().describe("What the company does in one sentence"),
    productSummary: z
      .string()
      .describe("What they build/sell and who it's for"),
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
  }),
});

// If oneLiner and productSummary are empty — wrong site or parked domain
// Skip to synthesis with job description and profile only
if (!homepageData.oneLiner && !homepageData.productSummary) {
  await stagehand.close();
  // proceed to synthesis with empty companyResearch
}

// Step 2 — Sub-page extraction (max 3, prefer about/blog/engineering/product over careers)
const subPageData = await stagehand.extract({
  instruction:
    "Extract substance that helps a candidate understand this company before applying: what they do, their values and how they work, the specific technologies and tools they use, notable projects or customers, and how the team operates. Ignore nav, footers, cookie banners, and generic marketing copy.",
  schema: z.object({
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
  }),
});

// Step 3 — NIM synthesis (after browser closes)
// Feed three data sources: company research + job from DB + profile from DB
const systemPrompt = `You are a sharp career strategist preparing a candidate to apply for a specific role. You are given (a) research collected from the company's own website, (b) the job posting, and (c) the candidate's profile. Produce a concise, concrete briefing that gives this specific candidate an edge for this specific role.

Rules:
- Ground every company claim in the provided research or job posting. Never invent funding, customers, headcount, or facts. If research was thin, infer carefully from the job posting and say what's inferred.
- Be specific to THIS candidate. Connect their actual skills and past work to this company's stack, product, and values. No generic advice that would apply to anyone.
- Turn the candidate's missing skills into a strategy: how to frame the gap honestly and what adjacent experience to lean on.
- Talking points and questions must reference real things from the research, the kind of detail that signals the candidate did their homework.
- Keep every item tight: one or two sentences. No fluff.

Return ONLY valid JSON matching this shape:
{
  "companyOverview": string,
  "techStack": string[],
  "culture": string[],
  "whyThisRole": string,
  "yourEdge": string[],
  "gapsToAddress": string[],
  "smartQuestions": string[],
  "interviewPrep": string[],
  "sources": string[]
}`;

const userPrompt = `COMPANY RESEARCH (from their website):
${JSON.stringify(companyResearch)}

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}
Matched skills (already computed): ${job.matched_skills.join(", ")}
Missing skills (already computed): ${job.missing_skills.join(", ")}

CANDIDATE PROFILE:
Current title: ${profile.current_title}
Experience: ${profile.years_experience} years, level ${profile.experience_level}
Skills: ${profile.skills.join(", ")}
Work history: ${JSON.stringify(profile.work_experience)}`;

const content = await streamNimContent({
  model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  temperature: 0.4,
  max_tokens: 4096,
  reasoning_budget: 1024,
  chat_template_kwargs: { enable_thinking: true },
  stream: true,
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
});
const dossier = JSON.parse(content);
```

**Dossier fields:**

| Field           | Type     | Purpose                                             |
| --------------- | -------- | --------------------------------------------------- |
| companyOverview | string   | What the company does                               |
| techStack       | string[] | Technologies they use                               |
| culture         | string[] | Values and working style                            |
| whyThisRole     | string   | Why this role exists                                |
| yourEdge        | string[] | Specific links between THIS candidate and this role |
| gapsToAddress   | string[] | Missing skills reframed as strategy                 |
| smartQuestions  | string[] | Questions that show real research                   |
| interviewPrep   | string[] | Topics to prepare for this role                     |
| sources         | string[] | Pages the company info came from                    |

**Rules:**

- Always use `extract()` with a Zod schema — never parse raw HTML or use regex
- Always wrap every `act()` and `extract()` in try/catch
- Always call `await stagehand.close()` when done — ends the Browserbase session
- Model is the NIM 30b reasoning model (see NVIDIA NIM section) — never the OpenAI API
- Temperature is `0.4` for synthesis — grounded but flexible enough to make real connections
- Max 3 sub-pages — never exceed this on free plan
- Always close session in finally block — never leave sessions open even if research fails
- Job description and profile always come from DB — never re-fetch via browser
- If browser research returns empty — still run synthesis with job + profile only
- yourEdge, gapsToAddress, and smartQuestions are the most valuable fields — never skip them

## NVIDIA NIM

The only AI provider in this project — OpenAI is never used. Powers extraction (feature 07), resume generation (feature 08), and job match scoring (feature 10). The `openai` npm package serves purely as the OpenAI-compatible transport, pointed at NVIDIA via `baseURL`.

### Client

```typescript
// lib/nim-client.ts
import OpenAI from "openai";

export const nim = new OpenAI({
  apiKey: process.env.NIM_API_KEY!,
  baseURL: "https://integrate.api.nvidia.com/v1",
});
```

### Streaming + Reasoning Model — use the shared helper

Reasoning models return two streams: `delta.reasoning_content` (internal chain-of-thought) and `delta.content` (final output). Only `delta.content` matters. All of this plumbing — the `NIMStreamParams` type, the stream-collect loop, and the `<think>` block + code-fence stripping — lives ONCE in `lib/nim-client.ts`. Agent files never reimplement it.

```typescript
// In an agent file:
import { streamNimContent, type NIMStreamParams } from "@/lib/nim-client";

const params: NIMStreamParams = {
  model: NIM_MODEL, // module constant in the agent file
  messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
  temperature: 0.2,
  top_p: 0.95,
  max_tokens: 8192,        // headroom — at 4096 dense resumes risked mid-JSON truncation
  reasoning_budget: 1024,
  chat_template_kwargs: { enable_thinking: true },
  stream: true,
};

// Returns final content only, already stripped of <think>…</think> and ``` fences —
// ready for JSON.parse.
const content = await streamNimContent(params);
const data = JSON.parse(content);
```

**Rules:**

- Always use `stream: true` — the model requires it
- Always call `streamNimContent()` from `lib/nim-client.ts` — never hand-roll the stream loop or fence-stripping in agent files
- Instruct JSON via system prompt — do not use `response_format: { type: "json_object" }`
- Agent functions log the raw error server-side and return a **friendly** `error` string — never surface provider/parse internals to the client (routes forward `result.error` verbatim)
- Two model constants, each defined in the agent file that uses it:
  - **Extraction** (`agent/extractor.ts`) → `"nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"` with `enable_thinking: true` + `reasoning_budget: 1024`, `max_tokens: 8192` — parsing a resume benefits from reasoning. The example above is this config.
  - **Generation** (`agent/resume-generator.ts`) → `"nvidia/nvidia-nemotron-nano-9b-v2"` with thinking disabled — **decision (2026-06-11): the 9b is sufficient for resume-writing quality and faster than the 30b alternative.** Its chat template ignores `chat_template_kwargs`, so the system prompt is prefixed with `/no_think` (that's what the 9b honors); `enable_thinking: false` is kept as a harmless cross-model safeguard.

---

## AI Model Rules

**OpenAI is never used in this project** — no OpenAI models, no `OPENAI_API_KEY`. Every LLM call goes through `streamNimContent` in `lib/nim-client.ts` (NVIDIA NIM section above), which holds the model constants and per-feature configs.

Cross-cutting rules for all model calls:

- **Job match scoring** (`agent/matcher.ts`, feature 10) → 30b reasoning model, `temperature: 0.2`, `max_tokens: 2048`, `reasoning_budget: 1024` — returns `{ matchScore, matchReason, matchedSkills, missingSkills }`
- **Research synthesis** (feature 13) → 30b reasoning model, `temperature: 0.4` — grounded but flexible enough to make real connections
- System prompts demand ONLY valid JSON — no markdown, no code fences (`streamNimContent` strips think-blocks and fences defensively)
- Always validate parsed JSON before using — wrap in try/catch and normalize fields defensively
- Match threshold is always `MATCH_THRESHOLD` from `lib/utils.ts` — never hardcode 70
- Company research synthesis must always return a complete dossier — never return empty even if browser research failed

---

## PostHog

**Check first:** Check AGENTS.md for an installed PostHog skill. If a PostHog MCP server is configured — use it. The skill/MCP will have the latest client and server patterns.

### Client Setup (Browser)

PostHog is initialised in `instrumentation-client.ts` (the Next.js client instrumentation
hook — runs once before the app), NOT in a manually-called `initPostHog()`. `lib/posthog-client.ts`
only re-exports the `posthog-js` singleton so app code can capture events.

```typescript
// instrumentation-client.ts — owns posthog.init (runs once, client-side)
import posthog from "posthog-js";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
  capture_pageview: "history_change", // automatic SPA pageviews on route change
  capture_pageleave: true,
  defaults: "2026-01-30",
});
```

```typescript
// lib/posthog-client.ts — singleton re-export for app code
import posthog from "posthog-js";
export { posthog };

// Capture event client-side
posthog.capture("job_found", {
  userId,
  source: "search",
  matchScore: score,
});
```

### Server Setup

```typescript
// lib/posthog-server.ts
import { PostHog } from "posthog-node";

export const createPostHogServer = () =>
  new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    flushAt: 1, // send immediately
    flushInterval: 0, // no batching — Next.js functions are short-lived
  });

// Always use and shutdown in the same function
const posthog = createPostHogServer();
posthog.capture({
  distinctId: userId,
  event: "company_researched",
  properties: { userId, jobId, company },
});
await posthog.shutdown(); // required — ensures event is sent
```

**Rules:**

- Always call `await posthog.shutdown()` in server-side functions — events are lost without it
- `flushAt: 1` and `flushInterval: 0` always set on server client
- Event names must match exactly the list in `code-standards.md`
- Always include `userId` as a property on every server-side event
- Call `posthog.identify(userId)` after login on client side
- Call `posthog.reset()` on logout on client side

> **Dashboard charts read from the DB, not PostHog (feature 17).** The public `phc_…` key is
> write-only, and `posthog-node` server captures are fire-and-forget — `company_researched` is
> `void`'d in the research route, so events are easily lost and PostHog is not a reliable read
> source. The three dashboard charts are computed from the user's `jobs` rows in
> `lib/chart-data.ts` (via `getUserJobs()`), the same source as the stat cards. PostHog stays
> capture-only.

---

## @react-pdf/renderer

**Check first:** Check AGENTS.md for an installed react-pdf skill. PDF generation APIs can differ from general training knowledge.

### Resume PDF Generation

```typescript
import { renderToBuffer } from '@react-pdf/renderer'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica' },
  section: { marginBottom: 10 },
  heading: { fontSize: 14, fontWeight: 'bold' },
  text: { fontSize: 10 },
})

const ResumePDF = ({ profile }: { profile: Profile }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.heading}>{profile.fullName}</Text>
        <Text style={styles.text}>{profile.email}</Text>
      </View>
    </Page>
  </Document>
)

// Generate buffer — element construction + rendering live together in
// lib/resume-pdf.tsx (renderResumePdfBuffer), NOT in the API route. This keeps
// routes as .ts files and keeps JSX out of try/catch (react-hooks/error-boundaries).
export function renderResumePdfBuffer(profile: Profile, content: GeneratedResumeContent): Promise<Buffer> {
  return renderToBuffer(<ResumePDF profile={profile} content={content} />)
}

// Upload via the shared overwrite helper — lib/resume-storage.ts owns the
// "SDK v1.3.1 has no upsert" workaround (guarded remove(), then upload()).
// Wrap in Uint8Array: Buffer<ArrayBufferLike> does not satisfy BlobPart.
const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' })
const { error } = await overwriteResume(insforge, userId, blob)
```

**Supported CSS properties (verified against @react-pdf/renderer in this project):**
```
padding, paddingTop, paddingBottom, paddingHorizontal, paddingVertical
margin, marginTop, marginBottom, marginRight, marginLeft
fontSize, fontFamily, fontWeight, color
lineHeight, textAlign, textTransform, letterSpacing
flexDirection, flexWrap, flex, alignItems, justifyContent
width, height, borderRadius
borderBottom, borderTop, borderLeft, borderRight (shorthand: "0.5pt solid #888888")
backgroundColor
```
Properties outside this list may be silently ignored. When in doubt, test with a real buffer.

**Hex color exemption:** the project-wide "no hardcoded hex" rule applies to UI components consuming the Tailwind `@theme` tokens. PDF templates (`lib/resume-pdf.tsx`) cannot consume CSS variables — literal hex values there are the sanctioned exception, scoped to that file.

**Rules:**

- Server-side only — never import in client components
- Always use `renderToBuffer` — not `renderToStream` or `PDFDownloadLink`
- PDF rendering is triggered only from `app/api/resume/` routes, via `renderResumePdfBuffer()` in `lib/resume-pdf.tsx` — routes never build PDF JSX/elements themselves (no `React.createElement` + casts in routes)
- Generated buffer uploaded directly to InsForge Storage via `overwriteResume()` from `lib/resume-storage.ts` — never written to disk, never hand-rolled remove+upload
- Always save the storage path back to the DB after upload and call `revalidatePath('/profile')`; if the upload fails after the old file was removed, clear `resume_pdf_url` so the DB never points at a missing file

---

## pdf-parse

**Check first:** Check AGENTS.md for an installed pdf-parse skill.

### Extract Text from Resume

**⚠️ pdf-parse v2 is class-based — NOT a default function.**

```typescript
import { PDFParse } from "pdf-parse";

// blob from insforge.storage.download() or a File from a request
const buffer = Buffer.from(await blob.arrayBuffer());
const parser = new PDFParse({ data: buffer });
const result = await parser.getText();
const text = result.text; // full raw text as a single string
```
```

**Rules:**

- Server-side only — never import in client components
- `pdfData.text` is raw unformatted text — the NIM extractor handles the structure extraction
- Always handle parse errors — some PDFs are image-based and return empty text
- If `pdfData.text` is empty or very short — return error to user: "Could not extract text from this PDF. Please try a different file."

---

## recharts (Dashboard Charts — feature 14)

Charts on `/dashboard` (`components/dashboard/*Chart.tsx`). recharts needs the DOM, so every
chart is a `"use client"` component wrapped in `<ResponsiveContainer width="100%" height="100%">`
inside a fixed-height box.

**Rules:**

- **Mount-gate the chart body.** recharts' `ResponsiveContainer` can't measure a 0×0 container
  during SSR and logs `width(-1)/height(-1)` warnings on every prerender. `components/dashboard/ChartCard.tsx`
  renders its children only after mount (`useSyncExternalStore` → false on server, true after
  hydration — no setState-in-effect), so charts never render server-side. Reuse `ChartCard` for any
  new chart rather than re-solving this. Pass `isEmpty`/`emptyLabel` to show a (non-gated) empty
  state instead of the chart body when there's no data.
- **Hex color props are the sanctioned no-hex exception.** recharts props (`stroke`, `fill`,
  axis `tick.fill`, grid `stroke`) take plain color strings and can't read Tailwind `@theme`
  tokens — the same exception `lib/resume-pdf.tsx` has for `@react-pdf`. Use the exact values
  from ui-tokens.md "Dashboard Chart Colors": line `#7c5cfc` (gradient fill rgba(124,92,252,0.2)),
  Resume Tailoring bars `#61a8ff`, Match Distribution bars `#10b981`, grid `#e7eaf3` (dashed),
  axis labels `#9ca3af` 12px. Define them as named consts at the top of the file with a comment.
- Axis styling: `tickLine={false} axisLine={false}`, `tick={{ fontSize: 12, fill: AXIS }}`;
  `CartesianGrid strokeDasharray="4 4" stroke={GRID} vertical={false}`.
