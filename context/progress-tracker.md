# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 2 — Profile Page
**Last completed:** 07 AI Profile Extraction from Resume
**Next:** 08 Resume PDF Generation from Profile

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
- [ ] 08 Resume PDF Generation from Profile

### Phase 3 — Find Jobs Page

- [ ] 09 Find Jobs Page — Full UI
- [ ] 10 Adzuna Job Discovery
- [ ] 11 Filter + Sort + Pagination

### Phase 4 — Job Details Page

- [ ] 12 Job Details Page — Full UI
- [ ] 13 Company Research Agent

### Phase 5 — Dashboard

- [ ] 14 Dashboard Page — Full UI
- [ ] 15 Stats Bar — Real Data
- [ ] 16 Recent Activity — Real Data
- [ ] 17 Analytics Charts — PostHog Data

---

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

### Feature 07 — AI Profile Extraction from Resume (2026-06-10)

Wired the "Extract from Resume" AI flow. `tsc` + `next build` clean.

- **`lib/nim-client.ts`** — exports an `OpenAI` instance pointed at NVIDIA NIM (`baseURL: "https://integrate.api.nvidia.com/v1"`, `apiKey: NIM_API_KEY`).
- **`agent/extractor.ts`** — `extractProfileFromResume(pdfText)` streams from `nvidia/nemotron-3-ultra-550b-a55b` with `enable_thinking: true` + `reasoning_budget: 16384`. Collects only `delta.content` (ignores `delta.reasoning_content`). Strips code fences before `JSON.parse`. Returns `{ success, data?: ExtractedProfile }`. Model defined as a module constant.
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
