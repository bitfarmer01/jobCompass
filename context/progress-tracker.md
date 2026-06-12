# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 5 — Dashboard (complete)
**Last completed:** 17 Analytics Charts — PostHog Data
**Next:** — (build plan complete through Phase 5)

> **Project location:** `/Volumes/PortableSSD/mac/aistack` (back on the SSD as of late
> 2026-06-11 after a brief relocation; the drive was cleaned — 965GB free). Note: the volume
> is exFAT with 1MB allocation blocks, so node_modules occupies far more on disk than its
> real size; if the drive ever fills again, `rm -rf node_modules .next` reclaims it fastest.

---

## Progress

### Phase 1 — Foundation

- [x] 01 Homepage
- [x] 02 Auth
- [x] 03 PostHog Initialization
- [x] 04 Database Schema

### Phase 2 — Profile Page

- [x] 05 Profile Page — Full UI
- [x] 06 Profile Save Logic
- [x] 07 AI Profile Extraction from Resume
- [x] 08 Resume PDF Generation from Profile

### Phase 3 — Find Jobs Page

- [x] 09 Find Jobs Page — Full UI
- [x] 10 Adzuna Job Discovery
- [x] 11 Filter + Sort + Pagination

### Phase 4 — Job Details Page

- [x] 12 Job Details Page — Full UI
- [x] 13 Company Research Agent

### Phase 5 — Dashboard

- [x] 14 Dashboard Page — Full UI
- [x] 15 Stats Bar — Real Data
- [x] 16 Recent Activity — Real Data
- [x] 17 Analytics Charts — PostHog Data

---

### Feature 17 — Analytics Charts (2026-06-12)

- **The 3 dashboard charts read real data computed from the user's `jobs` rows** —
  `lib/chart-data.ts` `getChartData()` → `{ jobsOverTime, companyResearch, matchDistribution }`,
  built from `getUserJobs()` (the same source as the stat cards). `app/dashboard/page.tsx` adds
  `getChartData()` to its `Promise.all` and passes each series down.
- **Data source = DB, not PostHog.** First implemented against the PostHog HogQL Query API
  (build-plan §17 wording), then switched: the public `phc_` key is write-only and the
  server-side `company_researched` capture is `void`'d/fire-and-forget in the research route, so
  events are lost and PostHog is an unreliable read source (observed live: 4 researched companies,
  0 in the chart). The DB already holds everything. The `lib/posthog-query.ts` helper and the
  `POSTHOG_PERSONAL_API_KEY`/`POSTHOG_PROJECT_ID` env vars were removed.
- **§17 chart swap kept:** `ResumeTailoringChart` deleted, replaced by `CompanyResearchChart`.
  Final three: Jobs Found Over Time (30 days by `found_at`, area `#7c5cfc`), Company Research
  Activity (researched jobs, 7 days by `found_at`, bars `#61a8ff`), Match Score Distribution
  (`match_score` bucketed 50-60…90-100, bars `#10b981`).
- **Tradeoff:** `jobs` has no `researched_at`, so Company Research Activity is keyed by
  `found_at` (job-discovery day) — the accepted feature-16 inaccuracy. Acceptable because the
  signal is "research happened on recently-found jobs."
- **Charts take a `data` prop + have empty states.** `ChartCard` gained `isEmpty`/`emptyLabel`
  and renders a centered `ChartEmpty` (Sparkles + muted copy, matching `RecentActivity`) — not
  mount-gated, so it shows without the chart-body flash. Each series returns `[]` when it has no
  data in its window. HogQL/SQL grouping replaced by JS: zero-filled date axis + fixed buckets
  computed in code (per `dashboard-stats.ts`). `getChartData()` never throws.
- `tsc` + `eslint` + `next build` clean (17/17 routes, `/dashboard` dynamic `ƒ`, no recharts
  warnings).

---

### Feature 16 — Recent Activity Real Data (2026-06-12)

The dashboard Recent Activity feed now shows the user's real completed job searches +
company-research entries. Only the three charts remain mock (feature 17). `tsc` + eslint +
`next build` clean (17/17).

- **`lib/activity.ts`** (new) — `getRecentActivity(limit = 6)`: user-scoped, parallel reads of
  `agent_runs` (status='completed') and `jobs` (with a dossier), merged + sorted by timestamp
  desc, sliced. `search` → "Found X jobs for [title]" (timestamp `completed_at ?? started_at`);
  `research` → "Researched [company]" (timestamp **`found_at`**). Degrades to `[]` on any
  auth/db failure (same resilient pattern as `lib/jobs`).
- **Research entries are timestamped by `found_at`** (job-discovery time), not a separate
  research timestamp. **`public.jobs` has NO `updated_at`/`researched_at` column** (verified via
  `get-table-schema` + a live `42703 column does not exist` probe — an earlier
  `information_schema` check matched a *different* schema's `jobs` table and was wrong). A first
  attempt to stamp `jobs.updated_at` in the research route was a **latent 42703 bug that would
  have broken every Research Company save** — reverted before any research run. Accurate
  research-time ordering would need a schema migration (new `researched_at` column) — deferred,
  offered as a follow-up.
- **`RecentActivity`** rewritten from the mock array to a `items: ActivityItem[]` prop. Two dot
  colors per build-plan §16 — `search` = success green (success-light/success-alt), `research` =
  info blue (info-light/info). Added an **empty state** (Sparkles + "No activity yet").
- **`app/dashboard/page.tsx`** — `getRecentActivity()` added to the `Promise.all`; passes
  `items={activity}`.
- **SDK note:** "company_research IS NOT NULL" is filtered **in code**, not the query — the
  InsForge db SDK documents only `.is(col, null)` for null checks, not its inverse (`.not(...)`
  is undocumented). Selects recent rows (user-scoped, small set) and filters in JS. Recorded in
  library-docs.

### Feature 15 — Stats Bar Real Data (2026-06-11)

The four dashboard stat cards now show real per-user numbers; charts + recent activity stay
mock (features 16-17). `tsc` + eslint + `next build` clean (17/17).

- **`lib/dashboard-stats.ts`** (new) — `getDashboardStats()`: reuses `getUserJobs()` (the
  user-scoped, failure-degrading jobs read) and computes in code — totalJobs, avgMatchRate
  (rounded mean of non-null `match_score`, 0 when none), companiesResearched (`company_research`
  non-null), jobsThisWeek (`found_at` within 7 days). No SQL aggregates: the per-user row set is
  small and reusing `getUserJobs` keeps one source of truth (also inherits its degrade-to-empty).
- **`StatsGrid`** now takes `stats: DashboardStats` (was a self-contained mock array); labels +
  icons live here, values come from props. **4th card changed** "Cover Letters Generated"
  (no backing data) → **"Jobs This Week"** (Calendar icon) per build-plan §15.
- **`StatCard.trend` is now optional** and the trend badge renders only when present. Real data
  passes no trend — there's no honest week-over-week basis yet, and §15 only specifies the four
  values (deliberately not fabricating `↑12%` deltas, consistent with the honest-fit ethos).
- **`app/dashboard/page.tsx`** — fetches `getProfileStatus()` + `getDashboardStats()` in
  `Promise.all`; passes `stats` to `StatsGrid`.
- **`ChartCard` SSR-gate rewritten** (feature 14 follow-up): the `useEffect(setMounted)` mount
  gate tripped the new `react-hooks/set-state-in-effect` lint rule, so it now uses
  `useSyncExternalStore` (server snapshot `false`, client `true`) — same SSR-only-render
  behavior, no effect, lint clean.
- **Feature 14 docs closed:** `recharts` added to code-standards approved deps; recharts section
  added to library-docs (mount-gate + sanctioned-hex rules); all 8 dashboard components
  registered in ui-registry.

### Feature 14 — Dashboard Page Full UI (2026-06-11)

Full `/dashboard` UI on mock data (per the build-plan's "full UI first" principle), with
the one genuinely-conditional element — the incomplete-profile banner — wired to real data.
`tsc` + eslint + `next build` all clean (17/17); recharts SSR warning eliminated.

- **`app/dashboard/page.tsx`** — rebuilt from the placeholder into an async Server Component.
  Reads `getProfileStatus()`; renders `IncompleteProfileBanner` only when `!isComplete`, then
  `StatsGrid` → (JobsOverTime + RecentActivity) → (ResumeTailoring + MatchDistribution).
  Container `w-full max-w-[1440px] mx-auto px-8 py-8 flex flex-col gap-6`.
- **`lib/profile.ts`** (new) — `getProfileStatus()`: server read of the signed-in user's
  profile row, coerced to `CompletionInput` and run through the canonical
  `getProfileCompletion` (same helper as the profile ring + `saveProfile`). Degrades to
  "incomplete, all missing" on any auth/db failure — the banner is a nudge, never a blocker.
- **`components/dashboard/`** (8 components): `StatCard`/`StatsGrid` (4 mock stat cards +
  `TrendingUp` trend badge), `RecentActivity` (5 mock entries, dot colors per ui-tokens),
  `IncompleteProfileBanner` (presentational, accent-muted pills + link to /profile),
  `ChartCard` (shared client shell, mount-gates the chart body so recharts never renders SSR),
  and three recharts charts: `JobsOverTimeChart` (Area, #7C5CFC gradient), `ResumeTailoringChart`
  (Bar, #61A8FF), `MatchDistributionChart` (Bar, #10B981). Chart set follows build-plan §14
  (Resume Tailoring kept, not §17's Company Research swap).
- **`recharts@3.8.1`** added. **Hex literals in the chart components are the sanctioned
  exception** (same as `lib/resume-pdf.tsx`): recharts props can't read `@theme` tokens — the
  values come straight from ui-tokens.md "Dashboard Chart Colors". Documented in library-docs.
- **`components/icons/index.tsx`** — added `TrendingUp` + `TrendingDown` (stat-card trends).
- **Real wiring deferred to 15-17 as planned:** stat counts, recent-activity feed, and the
  three chart series are mock. Note: the browser InsForge client is still sessionless (feature
  08 caveat) — realtime/PostHog chart reads in 16/17 must go through the server.

### Honest fit verdict in the dossier (2026-06-11)

The Fit & Strategy content was sycophantic — the first live dossier told a 10%-match
candidate their "leadership experience as a boss demonstrates ability to guide trading
teams". The dossier now tells the truth, palatably. **Live-verified on both real jobs.**

- **`CompanyDossier` gained `fitLevel` (`"strong" | "moderate" | "stretch" | ""`) and
  `fitSummary`** (`types/index.ts`); `toDossier` whitelists the level — anything else
  (incl. legacy dossiers) → `""` and the UI hides the verdict (`lib/dossier.ts`).
- **Synthesis prompt honesty rules** (`agent/researcher.ts`): fit judged from the match
  score + matched/missing skills (now passed in the JOB POSTING block); "NEVER manufacture
  connections"; `yourEdge` must be empty rather than fabricated ("if a claimed edge would
  not survive a hiring manager's first question, it is not an edge"); `fitSummary` = what
  a trusted mentor would say — for stretch fits it names the core gap, what would change
  the picture, and whether applying now is worth the effort.
- **`FitVerdict` banner** leads the Fit & Strategy tab (`CompanyResearch.tsx`): Strong Fit
  (success palette) / Moderate Fit (info) / Stretch Role (warning), rendering `fitSummary`.
- **Live results:** Blockhouse 10% match → `stretch`, "requires Rust engineering and trading
  systems expertise that you do not possess", `yourEdge: []` (the fabricated edge is gone),
  9.7s. BlackRock 72% → `moderate`, credits real AI alignment while naming the Rust gap,
  genuine edges only, 6.7s.

### Company Research Visual Redesign (2026-06-11)

Polished and upgraded the visual representation of the Company Research Agent dossier inside `/find-jobs/[id]`.

- **iOS-Style Switcher**: Added an interactive segmented tab selector that divides the 9 dossier fields into logical groupings: *Overview & Stack*, *Fit & Strategy*, and *Interview Prep*.
- **Spotlight Cards**: Styled specialized spotlight cards for *Your Edge* (green tint and glow), *Gaps to Address* (coaching target list), *Why This Role* (bold editorial italic layout), and *Smart Questions* (speech card containers).
- **Simulated Progress Loader**: Replaced the simple loader with a full status timeline ticker cycling through actual crawl/synthesis phases, complemented by a smooth animated progress bar filling up dynamically.
- **Micro-interactions**: Enhanced card layouts, tag layouts, and hover animations, passing TypeScript compilation and ESLint audits cleanly.

---

### Feature 13 revision — fetch-first research, identity guard, parse hardening (2026-06-11, post live run)

The first authenticated run exposed three defects; the research pipeline was redesigned and
**verified live end-to-end** (real DB jobs driven through `researchCompany` via an esbuild
bundle): wrong-company case 9.3s, correct-company case 9.5s — down from 10+ minutes and a
dead Browserbase session.

- **Per-page LLM extraction is GONE** (root cause of the slowness: Stagehand `extract()`
  chunks the whole DOM through the model — 318s for ONE page on NIM, blowing the 120s
  session). Pages are now fetched as plain HTML server-side and stripped to text in code
  (`htmlToText`, regex link extraction, code-ranked sub-pages, parallel sub-page fetches);
  the ONLY model call in the pipeline is the final 30b synthesis reading raw page text.
  A Browserbase session is opened only as a JS-shell fallback (<400 chars of homepage text)
  and reads pages via `page.evaluate` — still zero LLM in the browser.
- **Identity guard** (root cause of wrong-company research: Adzuna's redirect_url usually
  stays on adzuna.com, so `www.{company}.com` guessing is the COMMON path — the first run
  researched Blockhouse *Contract Furniture* for the Blockhouse *crypto-trading* job). The
  synthesis prompt now carries an identity check + `usedWebsiteResearch` flag: mismatched
  research is ignored and `sources` is emptied. Verified live on the exact failing job.
- **`parseNimJson` in `lib/nim-client.ts`** — robust JSON extraction (outermost `{...}`
  slice + control-char sanitization), used by BOTH the researcher and `agent/matcher.ts`.
  Fixes the live-observed `Let's craft…{json}` prose-prefix and raw-control-char failures,
  and the long-standing "Skipped — match scoring failed" silent job drops in search.
- Browserbase session timeout 120s → 300s; double-synthesis failure now writes an
  `agent_logs` ERROR row (failures were invisible outside the server console); loading copy
  updated to "usually done in under a minute".
- Removed: Stagehand model config (groq/nano-9b), both extraction zod schemas. The verified
  groq/`disableAPI` transport facts remain documented in library-docs.md for future use.

### Feature 13 — Company Research Agent (2026-06-11)

Browserbase/Stagehand agent researches the employer's website and a NIM synthesis writes a
9-field dossier to `jobs.company_research`; rendered in the job-details CompanyResearch card.
`tsc` + lint + `next build` clean; Stagehand extraction and NIM streaming verified LIVE via
scratch smoke scripts (not committed). Authenticated end-to-end browser run still pending.

- **`agent/researcher.ts`** — `researchCompany(job, profile, userId)`: derive employer homepage
  (server `fetch` follows the Adzuna redirect → root domain; fallback `www.{company}.com`),
  single Browserbase session (homepage extract + ≤3 sub-pages ranked about > engineering >
  product > blog > team > other > careers, same-root-domain only, per-page try/catch),
  `stagehand.close()` in `finally` BEFORE synthesis. **Always returns a dossier** — browser
  failure degrades to synthesis-only (logged via `logAgent`, level warning); only a double
  synthesis failure errors. `dossier.sources` is overwritten with actually-visited URLs.
- **Stagehand v3 config (hard-won, verified live — see library-docs.md):** `disableAPI: true`
  required for custom endpoints; model prefix must be `groq/` (OpenAI-compatible chat
  completions + structured outputs json_schema, which NIM honors — `openai/` 404s on
  /v1/responses, `togetherai/` sends no schema so the model invents keys); extraction model is
  the non-reasoning `nvidia/nvidia-nemotron-nano-9b-v2` + `/no_think` (the 30b leaks reasoning
  into content on this transport); the 30b reasoning model stays on dossier synthesis.
- **`app/api/agent/research/route.ts`** — POST {jobId}; mirrors the find route (401/422/404,
  `[api/agent/research]` logging, `{success:false,error}` shape); reuses `getJobById`
  (user-scoped); persists user-scoped update; fire-and-forget `logAgent` success row + PostHog
  `company_researched` {userId, jobId, company}. No `maxDuration` (library-docs rule).
- **`lib/browserbase.ts`** (client factory, 120s session) / **`lib/dossier.ts`** (`toDossier`
  jsonb→`CompanyDossier|null` normalizer, shared by page render and synthesis — single source
  of truth) / **`types/index.ts`** `CompanyDossier` / **`lib/agent-logs.ts`** `runId` widened
  to `string | null` (DB column is nullable).
- **`components/job-details/CompanyResearch.tsx`** — now a Client Component: empty state +
  wired button → loading state (1–3 min copy, `role="status"`) → `router.refresh()` renders
  all 9 dossier sections (see ui-registry); error banner mirrors SearchControls.
- **`lib/nim-client.ts` (merge fix):** the raw-fetch SSE parser now buffers partial lines
  across network chunks (a split `data:` event would have crashed `JSON.parse`). Known edge,
  verified live: on trivial prompts the 30b can finish entirely inside `reasoning_content`
  leaving `content` empty (→ parse failure → researcher retries once). Realistic synthesis
  prompts return clean JSON in `content`.
- **Slim-deps refactor merged** (parallel work, adopted): local `components/icons` barrel
  replaces `lucide-react`; `openai` SDK dropped (raw-fetch NIM client); deps re-added for this
  feature: `@browserbasehq/stagehand@^3.5.0`, `@browserbasehq/sdk@^2.14.0`, `zod@^4.4.3`.
- **Env:** `.env.local` key renamed `BROSWERBASE_ID` → `BROWSERBASE_PROJECT_ID` (typo fix);
  code reads only `BROWSERBASE_API_KEY` + `BROWSERBASE_PROJECT_ID`.

### Feature 04 — Database Schema (2026-06-09)

Four tables + RLS created via InsForge MCP `run-raw-sql` (no app code). Matches `architecture.md` schema exactly.

- **Tables:** `profiles` (24 cols, PK `id` = `auth.users(id)` ON DELETE CASCADE — the auth uid *is* the profile id, no separate user_id), `agent_runs` (8), `jobs` (23), `agent_logs` (7). Column counts verified against `architecture.md`.
- **RLS is the security gate** (per build-plan 04): real Postgres RLS enabled on all four; one `FOR ALL TO authenticated` owner policy each (`USING`/`WITH CHECK` = `auth.uid()` matches the row's user). InsForge exposes `auth.uid()` (= JWT `sub`) — Supabase-style. App code still filters by `user_id` (defense in depth).
- **Grants — read this before creating future tables:** InsForge auto-grants **both** `anon` and `authenticated` full CRUD on every new table (its `ALTER DEFAULT PRIVILEGES` at the role level — the standard PostgREST model). Row security comes from RLS, not the grants (`anon` has no policy → default-deny → zero rows). For these four user-private tables we additionally **`REVOKE`d `anon`** as defense-in-depth, so only `authenticated` is granted. Caveat: any future table will again receive the `anon` default grant — for user-private tables, revoke `anon` per-table (or rely on RLS default-deny). Do **not** strip `anon` from the global default privileges — that would break any future intentionally-public table. See `library-docs.md` InsForge section.
- **CHECK constraints** only on invariant-critical enums: `jobs.source IN ('search','url')`, `agent_runs.status IN ('running','completed','failed')`, `agent_logs.level IN ('info','success','warning','error')`. Descriptive enums (experience_level, remote_preference, job_type, etc.) left as free text.
- **FKs:** `user_id → profiles(id)` ON DELETE CASCADE (account delete cascades to all user data); `jobs.run_id`, `agent_logs.run_id`, `agent_logs.job_id` ON DELETE SET NULL (url-sourced jobs already allow null run_id; logs survive run/job purge).
- **Defaults:** `gen_random_uuid()` PKs (except `profiles.id`), `now()` timestamps, `is_complete=false`, `jobs_found=0`, arrays `'{}'`, `work_experience`/`education` jsonb `'[]'`. `profiles.updated_at` auto-maintained by a `BEFORE UPDATE` trigger (`public.set_updated_at`).
- **Indexes** on every FK/user_id column (`*_user_id_idx`, `jobs_run_id_idx`, `agent_logs_run_id_idx`) for user-scoped queries.
- **Storage `resumes` bucket DEFERRED to feature 07/08** — `architecture.md` ("authenticated, own files only") conflicts with `library-docs.md`'s `getPublicUrl()` pattern (needs a public bucket; the `resumes/{user_id}/resume.pdf` path is guessable → a public bucket leaks PII). Private-bucket + `createSignedUrl()` vs public is decided when the resume read pattern actually exists. See note in `library-docs.md`.
- **`run-raw-sql` rejects `BEGIN/COMMIT`** (transaction control not allowed) — it wraps the batch itself; send plain multi-statement DDL.

### Feature 12 — Job Details Page (2026-06-11)

Full job-details view at `/find-jobs/[id]`, wired to the real `jobs` row (no mock data). `tsc` clean; ui-registry imprinted (see "Job Details Components (feature 12)").

- **`app/find-jobs/[id]/page.tsx`** — async Server Component; `getJobById(id)` → `notFound()` when missing/not owned. Renders the detail card stack + back link.
- **`components/job-details/`** (7 components, all presentational): `JobHeader` (title/company/score pill badge — "No match score" when null/View Job Post), `JobInfoCards` (salary/location/type/date found), `MatchReasoning` (match_reason paragraph), `SkillsComparison` (matched green / missing warning-orange badges), `JobDescription` (about_role + source link), `CompanyResearch` (empty state only — Research button wired to POST `/api/agent/research` in feature 13), `ApplyBar` (apply link, new tab).
- **`lib/jobs.ts`** — added `getJobById(id)`: user-scoped single-job read, `Job | null`, resilient try/catch (same pattern as `getUserJobs`).
- Apply target = `job.external_apply_url ?? job.source_url`.
- The matcher `match_reason` copy fix + 14-row backfill (logged under the Scoring revision entry below) was surfaced by this feature's MatchReasoning section.

### Scoring revision — Keyword-first, LLM fallback (2026-06-11)

Revisits feature 10's matcher: a deterministic keyword layer now runs FIRST; the NIM reasoning model only scores jobs the keyword layer can't resolve. Cheaper (fewer LLM calls), stable/repeatable on the common case, and reserves the model for genuinely ambiguous jobs. `tsc` clean; keyword logic validated against symbol-skill and word-boundary edge cases.

- **`agent/matcher.ts`** — `scoreJob(job, profile, searchedTitle?)` now routes: `keywordScore()` first, else `scoreJobWithLLM()` (the prior NIM logic, unchanged).
  - **`keywordScore`** returns a deterministic `JobScore`, or `null` (= "not an exact keyword match" → fall back to LLM). A confident match requires BOTH title alignment (searched title or any `job_titles_seeking` appears in `job.title`) AND ≥1 skill keyword present in the listing. Else → `null`.
  - **`keywordHit`** — word-token match with **non-alphanumeric boundaries** (not `\b`) + regex-escaping, so symbol skills (C++, C#, .NET, Node.js) match and substrings don't false-positive (`golang`↛`Go`, `reactjs`↛`React`).
  - **Score formula** — `60 (title base) + min(40, matchedCount×12)` → 1 skill = 72, 2 = 84, 3 = 96, 4+ = 100 (all ≥70 "High"). A coverage *ratio* was deliberately avoided — it punishes Adzuna's one-line snippets. `missingSkills: []` on this path (unknowable from a snippet without the full JD; documented).
- **`agent/adzuna.ts`** — `discoverJobs` passes its `jobTitle` into `scoreJob` so the keyword layer has the searched title for alignment.
- **Open items from the prior scoring review (NOT addressed here):** profile breadth (work_experience/remote/salary still unused by the LLM path), batched/calibrated LLM scoring, robust JSON-extraction + per-call timeout, re-scoring on the full JD. Tracked for a follow-up.
- **Copy fix (2026-06-11, surfaced by feature 12):** the keyword path's `match_reason` exposed internal jargon and contradicted the "AI Match Reasoning" heading ("Exact keyword match… Scored deterministically without AI."). Rewritten in `agent/matcher.ts` to natural user-facing copy via a `listSkills` helper (singular/plural + "A, B, and C" join; matched-skill casing left as the user typed it — normalizing all-caps would corrupt acronyms). Because `match_reason` is persisted at discovery time, the 14 existing legacy rows were **backfilled** via `run-raw-sql`, rebuilt from the structured `matched_skills` column (0 legacy rows remain). The LLM path's reason was already clean — unchanged.

### Feature 11 — Filter + Sort + Pagination (2026-06-11)

Jobs table cut over from mock data to the real `jobs` table; filter/sort/text-search/pagination now operate on the signed-in user's saved jobs. This closes the "search appears to do nothing" gap — the table previously rendered hardcoded mock rows so discovered jobs never showed. `tsc` clean; `/find-jobs` compiles and serves (307 → login when unauthenticated). Note: `next build` currently fails at the **unrelated** `/_global-error` prerender (Next internal `workStore` invariant; `next` drifted to 16.2.9 vs the pinned 16.2.7) — not introduced by this feature.

- **`lib/jobs.ts`** (new) — `getUserJobs()`: server-side read of the user's jobs, scoped `.eq("user_id")` (defense in depth over RLS), `.order("found_at", desc)`. Degrades to `[]` on any auth/db failure (mirrors `lib/auth.ts`) so the page renders its empty state instead of crashing. DB read lives here, not in a component, per the architecture boundary.
- **`lib/utils.ts`** — added `formatRelativeTime(iso)` for the Date Found column (Just now / N minutes / hours / Yesterday / N days / short date); returns `""` on bad input.
- **`app/find-jobs/page.tsx`** — now `async`; calls `getUserJobs()` and passes `jobs` into `JobsSection`.
- **`JobsSection.tsx`** — mock array deleted; accepts `jobs: Job[]`. Filter (All/High≥70/Low<70), sort (Match desc / Newest / Oldest by `found_at`), and case-insensitive company/title text search all run on real data, then map to display rows via `toRow` (nullable `title`/`company`/`salary`/`match_score` resolved to placeholders). Pagination: `PER_PAGE=20`, page state, slices the current page, resets to page 1 on any filter/sort change, clamps `safePage` if the set shrinks.
- **`JobsPagination.tsx`** — now functional: `onPageChange` wired to Previous/Next/page-number/first/last buttons with a compact page window + ellipses. (Was cosmetic — buttons had no handlers.)
- **`JobsTable.tsx`** — `MockJob` type renamed `JobRow` (real data, not mock).
- **`SearchControls.tsx`** — `router.refresh()` after a successful search re-runs the server component so newly saved jobs appear immediately; the success banner (client state) is preserved.

### Feature 10 — Adzuna Job Discovery (2026-06-11)

Find Jobs button wired end-to-end: Adzuna search → NIM scoring → DB save → real banner counts. Jobs table stays on mock data until feature 11. `tsc` + `next build` clean.

- **`lib/adzuna.ts`** (new) — `searchJobs(jobTitle, location, country)` per library-docs.md (always `category=it-jobs`, `results_per_page=10`, `where` omitted when location empty) + `detectCountry()` keyword lookup (gb/au/ca, default us). **Env names are `ADZUNA_ID` + `ADZUNA_API_KEY`** (actual `.env.local` names — code-standards/library-docs updated from the older `ADZUNA_APP_ID`/`ADZUNA_APP_KEY`).
- **`agent/matcher.ts`** (new) — `scoreJob(job, profile)` on NIM `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` (same as extractor; scoring quality is the core product value). Returns `JobScore` (`matchScore` 0-100 clamped, `matchReason`, `matchedSkills`, `missingSkills`), defensively normalized.
- **`agent/adzuna.ts`** (new) — `discoverJobs()` orchestrator: search → score all results concurrently (`Promise.allSettled`) → map to `jobs` rows (`source: 'search'`, salary `$Xk - $Yk` or null, snippet as `about_role`, empty bullet arrays). Follows the agent contract: returns `{ success, data?: { records, totalFound }, error? }` with its own try/catch + friendly error. **A job whose scoring fails is skipped, not saved** (warning logged to agent_logs) — a row without match data would break the score-bar UI.
- **`lib/agent-logs.ts`** (new) — `logAgent({ runId, userId, message, level, jobId? })`: best-effort insert into `agent_logs`, never throws (logging can't fail a run). Human-readable messages — this feeds the dashboard recent-activity feed (feature 16). Search runs log: `success` summary on completion, `warning` per skipped job, `error` on discovery/persistence failure. code-standards.md Agent Code section updated to this real pattern.
- **`app/api/agent/find/route.ts`** (new) — POST: auth → 422 on empty jobTitle / missing profile → insert `agent_runs` (`running`) → `discoverJobs` → bulk-insert jobs → update run (`completed` + `jobs_found`). Any mid-run failure marks the run `failed` (never stuck on `running`); **all `agent_runs` updates are scoped `.eq("id").eq("user_id")`** per the always-filter-by-user invariant (defense in depth over RLS). Returns `{ success, jobsFound, totalFound, strongMatches }` (strong = `match_score >= MATCH_THRESHOLD`). PostHog `job_search_started` + per-job `job_found` (`{ source, matchScore }` per project-overview spec) — wrapped, can never fail the response.
- **Types** — `Job`, `JobInsert`, `AgentRun`, `AgentRunStatus`, `JobScore` added to `types/index.ts` (snake_case, mirroring the tables).
- **`SearchControls.tsx`** — mock defaults/banner removed; inputs start empty. Find Jobs → `fetch POST /api/agent/find`, button disabled + `Loader2` spinner + "Searching..." while running. Success banner shows real counts; new error banner (`border-error/30 bg-error/10 text-error`, TriangleAlert icon) for failures/empty title.
- **OpenAI purge (same pass, user mandate: no OpenAI anywhere)** — "GPT-4o" removed from Hero/HowItWorks copy (→ "AI") and all context docs (→ NIM); mock company "OpenAI" → "Anthropic"; `OPENAI_API_KEY` dropped from code-standards env table; library-docs "OpenAI GPT-4o" section replaced with "AI Model Rules" (NIM); **feature 13 Stagehand blocks re-specced to NIM via OpenAI-compatible custom model config — verify when feature 13 starts**. The `openai` npm package STAYS — it is purely the OpenAI-compatible transport for NIM in `lib/nim-client.ts`, never the OpenAI API.

### Feature 09 — Find Jobs Page Full UI (2026-06-11)

Full UI with mock data. `tsc` + `next build` clean.

- **`app/find-jobs/layout.tsx`** — same auth-aware navbar shell as dashboard/profile layouts.
- **`app/find-jobs/page.tsx`** — Server Component; assembles SearchControls + the jobs card (JobFilters + JobsTable + JobsPagination).
- **`components/find-jobs/SearchControls.tsx`** — Client Component. Two controlled inputs (JOB TITLE with Search icon, LOCATION), primary Find Jobs button, green success banner ("Found 8 jobs and saved 4 strong matches.") with Sparkles icon. Mock values pre-filled.
- **`components/find-jobs/JobFilters.tsx`** — Client Component. Text search input (Filter by company or role...) + two controlled Radix Selects: "All Matches" (all/high/low) and "Match Score" (match-score/newest/oldest).
- **`components/find-jobs/JobsTable.tsx`** — Client Component (`useRouter` for row click). HTML table with 6 columns (COMPANY, ROLE, MATCH SCORE, SALARY EST., SOURCE, DATE FOUND). Mock 6-row data (Vercel 94%, Stripe 88%, Linear 96%, Notion 72%, Anthropic 91%, Figma 85%). Company cell: Building2 icon in rounded box + name. Match score cell: inline progress bar + percentage. Source cell: accent/muted badge (Search/URL). Row hover: `bg-surface-secondary`. Rows separated by `border-b border-border`.
- **`components/find-jobs/JobsPagination.tsx`** — Server Component. "Showing 1 to 6 of 24 results" left; Previous / page buttons / ellipsis / last page / Next right. Active page button uses `variant="default"` (accent fill); others `variant="outline"`.
- **Score bar color rule:** ≥90% green (`bg-success`), ≥75% blue (`bg-info-medium`), <75% orange (`bg-warning`) — canonical thresholds per ui-tokens.md. Bar track: `bg-border-light`, height `h-1`, `w-20`.

---

### Feature 08 — Resume PDF Generation from Profile (2026-06-11)

"Generate Resume from Profile" wired end-to-end. Shipped after a /review + /code-review pass — all confirmed findings fixed. `tsc` + eslint clean.

- **`agent/resume-generator.ts`** — `generateResumeContent(profile)` runs on NIM **`nvidia/nvidia-nemotron-nano-9b-v2`** (decision: sufficient writing quality, faster than the 30b alternative). The 9b's chat template ignores `chat_template_kwargs`, so the system prompt is prefixed with **`/no_think`** (verified against the live endpoint); `enable_thinking:false` kept as a cross-model safeguard. Output JSON (`GeneratedResumeContent` in `types/index.ts`) is defensively normalized (trim/filter) so the PDF never renders dangling separators or empty bullets.
- **`lib/nim-client.ts`** — now owns ALL shared NIM plumbing: `NIMStreamParams` type + `streamNimContent()` (stream-collect + `<think>`/code-fence stripping). Both agents use it; never reimplement in agent files.
- **`lib/resume-storage.ts`** (new) — `RESUME_BUCKET`, `resumePath(userId)`, and `overwriteResume()` (guarded `remove()` — it THROWS when the file is missing — then `upload()`). Single owner of the "SDK has no upsert" workaround; used by `uploadResume`, the generate route, and referenced constants by `GET /api/resume` + extract route. **The original generate route 500'd for first-time generators because its bare `remove()` threw — fixed here.**
- **`lib/resume-pdf.tsx`** — `ResumePDF` template + **`renderResumePdfBuffer()`** (element construction + `renderToBuffer` live together so routes stay `.ts`, no JSX-in-try/catch, no double-casts). `formatDateRange` now parses only `YYYY[-MM[-DD]]` and renders anything else verbatim (AI-extracted dates are prompt-enforced only). Hex colors in this file are the sanctioned exception to the no-hex rule (PDF can't read CSS tokens).
- **`app/api/resume/generate/route.ts`** — POST: auth → profile fetch (422 if missing/no name) → generate → render → `overwriteResume` → update `resume_pdf_url` → `revalidatePath`. Failure paths are honest: upload failure clears `resume_pdf_url` (the old file is already gone — never point at a missing file); DB-update failure returns 500 "please try again" (retry overwrites + repairs); `resume_generated` PostHog event fires with `success:true|false` and can never fail the response (wrapped).
- **Friendly errors restored** — `extractor.ts` + `resume-generator.ts` log the raw error server-side and return generic user-facing messages (raw provider/parse internals were leaking to the client).
- **`agent/extractor.ts`** — `max_tokens` 4096 → **8192** (dense multi-page resumes risked mid-JSON truncation if reasoning tokens count against the cap); `reasoning_budget` stays 1024.
- **`lib/blank-profile.ts`** (new) — single `blankProfile()` constructor; replaces the duplicated `blankProfile` (profile page) + `makeEmptyProfile` (ProfileForm).
- **ProfileForm** — Clear is now two-step (Cancel / danger-styled Confirm Clear, same pattern as ResumeUpload's delete confirm); Restore Previous returns to the last-saved snapshot.
- **Also in this branch (beyond §08 scope, accepted):** `deleteResume()` Server Action + delete-with-confirmation UI + `resume_deleted` event (code-standards updated); extractor retune (model → `nemotron-3-nano-omni-30b-a3b-reasoning`, temp 0.2).
- **Download added** — `GET /api/resume?download=1` serves `Content-Disposition: attachment` (default stays `inline` for View); ResumeUpload's resume row now has View / Download / Delete.
- **Deps added:** `@react-pdf/renderer@^4.5.1`; `serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@react-pdf/renderer"]` in `next.config.ts`.
- **Known accepted limitations:** PDF auto-paginates (a maxed-out profile can spill to page 2 — "single-page" not hard-enforced); `profile as Profile` cast in the route skips the page's DB→Profile mapping (verified safe: all ResumePDF/generator accesses are guarded).

### Feature 07 — AI Profile Extraction from Resume (2026-06-10)

Wired the "Extract from Resume" AI flow. `tsc` + `next build` clean.

- **`lib/nim-client.ts`** — exports an `OpenAI` instance pointed at NVIDIA NIM (`baseURL: "https://integrate.api.nvidia.com/v1"`, `apiKey: NIM_API_KEY`).
- **`agent/extractor.ts`** — `extractProfileFromResume(pdfText)` streams from `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` with `enable_thinking: true` + `reasoning_budget: 1024`. Collects only `delta.content` (ignores `delta.reasoning_content`). Strips code fences before `JSON.parse`. Returns `{ success, data?: ExtractedProfile }`. Model defined as a module constant.
- **`app/api/resume/extract/route.ts`** — `POST` (no body needed). Auth → `storage.download("{userId}/resume.pdf")` → `pdf-parse` → min-length guard (100 chars) → `extractProfileFromResume` → fires `resume_extracted` PostHog event (server-side, `createPostHogServer()` + `shutdown()`) → returns `{ success, data }`.
- **`ResumeUpload.tsx`** — added `onExtracted?: (data: ExtractedProfile) => void` prop and "Extract from Resume" button (visible only when `hasResume === true`). Uses plain `fetch` + local `isExtracting` state. Shows success banner on completion.
- **`ProfileForm.tsx`** — added `handleExtracted` that splits `education[0]` into the separate `education` state and merges the rest into `form` state via spread. Passes it to `<ResumeUpload onExtracted={handleExtracted} />`.
- **Deps added:** `openai@6.42.0`, `pdf-parse@2.4.5`, `@types/pdf-parse@1.1.5`.
- **`NIM_API_KEY`** added to env vars table in `code-standards.md`. NIM section added to `library-docs.md`.

### Feature 06 — Profile Save Logic (2026-06-09)

Wired the profile form to the DB. Build + tsc + eslint clean. UI-only resume upload left untouched.

- **`actions/profile.ts` — `saveProfile(input: ProfileFormData)`** Server Action. Re-reads `id`+`email` from auth (never trusts the client), normalizes the form, computes `is_complete`, and **`.upsert()`s on PK `id`** (first save creates the row — no signup trigger exists). Returns `{ success, error? }`, never throws.
- **`lib/profile-completion.ts`** — promoted feature 05's inline `requirements` list into a shared, framework-agnostic helper (`REQUIRED_FIELDS` + `getProfileCompletion`). Used by BOTH the client ring (live) and the Server Action (authoritative). The 10-field required set is now the single source of truth (the dashboard "incomplete profile" banner, feature 14, will depend on it).
- **Only `is_complete` is persisted.** The `profiles` table has no `completion_percentage`/`missing_fields` columns (schema frozen in 04, confirmed against `architecture.md`), so percentage + missing labels are **derived** on read/client — not stored. `build-plan.md` §06 annotated accordingly.
- **Resume upload SHIPPED in 06 — bucket access model RESOLVED = PRIVATE.** (Originally deferred; pulled forward at user request.) Created a **private** `resumes` bucket via MCP `create-bucket` (`isPublic: false`). `uploadResume(formData)` in `actions/profile.ts` validates PDF (≤5 MB), `remove()`s then `upload()`s to `{userId}/resume.pdf` (no `upsert` in SDK), and upserts `resume_pdf_url` = the storage **path** (not a URL — private bucket has none). The PDF is served only through the authenticated **`GET /api/resume`** route, which derives the path from the session so a user can fetch only their own file (verified-by-construction ownership). Fires `resume_uploaded`. SDK v1.3.1 has no `createSignedUrl`, so the auth-route + `download()` is the private-serving pattern; 07/08 read the PDF server-side via the same `download()`.
- **`profile_completed` PostHog event** fires only on a genuine `is_complete` false→true transition (prior state read from the DB each save), with `await posthog.shutdown()`.
- **Prefill:** `app/profile/page.tsx` now reads the real row (`.eq("id", userId).maybeSingle()`) and maps DB→`Profile` (integer→string years, null→"" enums, jsonb arrays coerced); blank profile (email prefilled) when no row. Round-trip with the action's mapping is lossless.
- **Field-mapping rules:** `""` enums → `null`; `years_experience` string → integer/`null`; empty work-experience roles dropped (cap 3); single `education` form record ⇄ `education[]` jsonb.
- **`zod` is NOT installed** (despite being in the approved list) — used a dependency-free normalizer; no new dep added. zod stays reserved for agent schemas.
- **RLS end-to-end** (open since feature 04) is now testable: `saveProfile` only ever writes `id = userId` and prefill scopes to the caller — verify under a real user JWT during manual test.

### Feature 05 — Profile Page Full UI (2026-06-09)

Complete `/profile` UI on a partially-filled mock profile. No save logic (feature 06). Build verified via `tsc --noEmit` + `next build` + eslint (all clean).

- **shadcn/ui adopted — but set up by hand.** Architecture said "components/ui = shadcn", but nothing was installed and every prior component was hand-rolled. Chose to introduce shadcn for the form primitives. **Did NOT run `npx shadcn init`** (it rewrites `globals.css` and would clobber the `@theme` tokens). Instead authored `components.json` + `lib/utils.ts` (`cn` + `MATCH_THRESHOLD`) manually and hand-wrote each primitive (`button, input, textarea, label, select, checkbox`) in `components/ui/`, styled directly to project tokens. New deps added to the approved list: `class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/react-{slot,select,checkbox,label}`. See `code-standards.md` shadcn setup note.
- **`types/index.ts` created** — `Profile`/`WorkExperience`/`Education` typed to the `profiles` table in **snake_case** so feature 06's Server Action writes through with no mapping layer. Enum unions for experience_level / remote_preference / work_authorization / cover_letter_tone (each allows `""` for "unset").
- **ProfileForm is a controlled Client Component** owning all state; chips (TagInput), role cards (up to 3), checkboxes, dropdowns and the completion ring all react live. Feature 06 lifts this into a Server Action.
- **Completion calc is local to 05** — a `requirements` list of 10 fields inside `ProfileForm` drives the live percentage + missing-field tags. Feature 06 owns the canonical calc (per build-plan: completion % + missing fields saved to DB) and should promote this to a shared helper.
- **Education modeled as a single entry** in the form (Highest Degree dropdown + Field + Institution + Year), stored as `education[0]`. Degree options are a static list (High School → PhD) since `education` is free-form jsonb.
- **Email is real, everything else mock.** Page is a Server Component reading `getCurrentUser()` for the non-editable email; rest is a partial mock (personal info + skills filled; work experience, education, remote preference empty → ~70% complete, so both filled states and the "needs attention" banner are visible).
- **ResumePreview deferred** to 07/08 (nothing to preview yet). ResumeUpload's drag-drop + buttons are visual only — file selection shows the name locally but does not upload.
- Components added: `components/profile/{CompletionIndicator,TagInput,WorkExperienceCard,ResumeUpload,ProfileForm}.tsx`. All registered in `ui-registry.md`.

### Auth hardening pass (2026-06-09, post feature 05)

Review of sign-in/sign-out surfaced 7 findings; fixed the actionable ones (build + lint clean):

- **Sign-out now revokes server-side** — `app/api/auth/logout/route.ts` calls `insforge.auth.signOut()` (server client), which POSTs `/api/auth/logout?client_type=mobile` to InsForge to **revoke the refresh token** (previously the token stayed valid until expiry). Explicit `res.cookies.delete` for both cookies kept as a guaranteed browser-side clear. Verified via SDK source: server-mode `signOut()` hits the revoke endpoint then clears the store; cookie path is `/` (matches the delete).
- **Back-button flash closed** — `proxy.ts` sets `Cache-Control: no-store, must-revalidate` on all protected-path responses, so the browser bfcache/router cache can't restore an authenticated page after logout.
- **OAuth redirect fallback** — `app/login/page.tsx` now reads `data.url` from `signInWithOAuth` and does `window.location.href = data.url` if the SDK returns the URL without navigating (defensive; SDK auto-redirects by default unless `skipBrowserRedirect`).
- **`LogoutButton` uses the shadcn `<Button variant="secondary">`** instead of hand-rolled classes (the classes were already identical). Registry entry updated.
- **PostHog doc drift reconciled** — `library-docs.md` now matches reality: init lives in `instrumentation-client.ts` with `capture_pageview: 'history_change'` (automatic SPA pageviews); `lib/posthog-client.ts` is just a singleton re-export.
- **DEFERRED (not a bug today): browser InsForge client has no session.** Tokens live only in httpOnly cookies, so the browser `insforge` singleton (`createBrowserClient()`) can't read them — `insforge.auth` on the client is sessionless. Fine now (all auth reads are server-side via `getCurrentUser()`), but **client-side InsForge calls (realtime subscriptions, client DB reads) will fail to authenticate** — must be addressed when building the dashboard realtime/charts (features 16/17), e.g. hydrate the browser client from a server-provided session or route those reads through the server.

## Decisions Made During Build

- `@insforge/sdk@1.3.1` installed for auth + backend
- Used `@insforge/sdk/ssr` (`createBrowserClient`, `createServerClient`, `updateSession`) for proper Next.js cookie-based session handling
- `lib/insforge-client.ts` — browser singleton via `createBrowserClient()` (reads env vars automatically)
- `lib/insforge-server.ts` — async factory via `createServerClient({ cookies })` using `next/headers`
- `proxy.ts` (not `middleware.ts`) — Next.js 16 renames the file convention; `middleware` export renamed to `proxy`
- `app/api/auth/refresh/route.ts` — token refresh endpoint used by browser client for session persistence
- `app/api/auth/exchange/route.ts` — server-side PKCE code exchange; receives `{ code, codeVerifier }` from the callback page, calls InsForge's exchange endpoint server-to-server, and sets `insforge_access_token` + `insforge_refresh_token` as same-origin httpOnly cookies so the proxy can read them immediately
- `app/auth/callback/page.tsx` — Client Component; reads `insforge_code` from URL + `insforge_pkce_verifier` from sessionStorage, POSTs both to `/api/auth/exchange`, then navigates to `/dashboard`. Does NOT import the `insforge` singleton (which would auto-exchange client-side, leaving tokens in-memory only and causing the proxy to redirect to /login)
- `allowedRedirectUrls` — updated via `PUT /api/auth/config` with admin API key; now contains `["http://localhost:3000/auth/callback", "http://localhost:3000/dashboard"]`
- Proxy uses a negative matcher (`/((?!_next/static|...).*)`), not a route allowlist — covers prefetched and `_next/data` routes automatically
- Proxy is optimistic checks only (cookie read, no DB). Secure checks must also live in Server Actions and Route Handlers (DAL pattern)
- Google/GitHub OAuth consent screen shows "InsForge" as the app name (InsForge uses shared OAuth credentials). This is a platform limitation; cannot be changed without configuring custom OAuth credentials in the InsForge dashboard

### Auth flow fix pass (2026-06-09)

End-to-end fix of the home → login → logout flow (feature 02 follow-up):

- **Sign-out added** — `app/api/auth/logout/route.ts` (POST) clears the `insforge_access_token` + `insforge_refresh_token` cookies; `components/layout/LogoutButton.tsx` calls it, fires `posthog.reset()` (build-plan 03), then `router.push("/")` + `router.refresh()`
- **Auth-aware navbar** — `Navbar` now takes an optional `user` prop; shows the user + Sign out when logged in, "Start for free" → `/login` when logged out
- **Authenticated app shell** — `app/dashboard/layout.tsx` renders the navbar (with Sign out) above protected pages so signed-in users are no longer trapped. `/profile` + `/find-jobs` should reuse this pattern
- **`lib/auth.ts`** — `getCurrentUser()` server helper wrapping `createInsforgeServer()` (previously unused); returns `{ id, email, name? } | null`, try/catch → null on failure
- **Adaptive homepage CTAs** — `app/page.tsx` is now an async server component; Hero + BottomCTA take a `ctaHref` (`/dashboard` when authed, else `/login`) per build-plan 01. Decision: no forced `/` → `/dashboard` redirect — the build-plan's adaptive-CTA spec wins over project-overview's "redirect" line, keeping the marketing page reachable
- **Callback default state** — `app/auth/callback/page.tsx` exchange `fetch` now has a 20s `AbortController` timeout so it can't spin forever; aborts/errors redirect to `/login?error=auth_failed`

### Review pass (post 01/02)

- Tailwind reconciled to **v4** as the project standard. AGENTS.md previously said "use 3.4" — that line contradicted package.json, `globals.css` (`@theme`), and the UI docs, so it was corrected to v4. No `tailwind.config.ts`; tokens live in `@theme`.
- `app/login/page.tsx` no longer uses `useSearchParams` — it reads `window.location.search` inside `useEffect`, matching the callback page. Avoids the Next.js "wrap in Suspense" build de-opt.
- `app/api/auth/exchange/route.ts` brought to the API-route standard — try/catch, `[auth/exchange]` logging, and `{ success: false, error }` response shape on every error path.
- `architecture.md` + `code-standards.md` synced to actual implementation: package is `@insforge/sdk` (SSR under `@insforge/sdk/ssr`, args-free client factories), auth routes at `app/login` + `app/auth/callback`, `proxy.ts` (not `middleware.ts`), and the `app/api/auth/*` routes added to the folder map.

---

## Previous Decisions

- `lucide-react@1.17.0` installed for icons
- Added `--color-accent-deeper: #4a2ec5` token (logo gradient second stop — not in original spec but needed)
- Added `--color-text-nav: #4a5565` token (navbar inactive link color from ui-rules.md)
- Hero uses `dashboard-demo.png` from public/images (real screenshot, not a mock)
- HowItWorks rebuilt as two-column "Manage Your Job Search" section — uses `jobs-lists.png`
- Features rebuilt as two-column "Apply With More Confidence" section — uses `agnet-log.png`
- Testimonial and Bottom CTA are inline sections in `app/page.tsx`
- Testimonial uses `user-icon.png` avatar from public/images
- Footer uses `new Date().getFullYear()` server-side — fine since Footer is a Server Component

---

## Notes

- All components use named exports (no default exports except page files)
- Navbar is a Client Component (needs usePathname for active state)
- All other homepage components are Server Components
- Resume generation (feature 08) runs on NVIDIA NIM `nvidia/nvidia-nemotron-nano-9b-v2` with a `/no_think` system-prompt prefix — **decided 2026-06-11: the 9b is sufficient for resume-writing quality and faster**; the 30b text model remains the fallback candidate if quality ever disappoints. The extractor stays on `...omni-30b-a3b-reasoning`. See `library-docs.md` → NVIDIA NIM.
