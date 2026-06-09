# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 1 — Foundation
**Last completed:** 03 PostHog Initialization
**Next:** 04 Database Schema

---

## Progress

### Phase 1 — Foundation

- [x] 01 Homepage
- [x] 02 Auth
- [x] 03 PostHog Initialization
- [ ] 04 Database Schema

### Phase 2 — Profile Page

- [ ] 05 Profile Page — Full UI
- [ ] 06 Profile Save Logic
- [ ] 07 AI Profile Extraction from Resume
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
