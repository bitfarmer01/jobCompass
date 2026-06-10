# UI Registry

Living document. Updated after every component is built. Read this before building any new component — match existing patterns exactly before inventing new ones.

---

## How to Use

Before building any component:

1. Check if a similar component already exists here
2. If yes — match its exact classes
3. If no — build it following ui-rules.md and ui-tokens.md, then add it here

After building any component — update this file with the component name, file path, and exact classes used.

---

## Components

### Navbar
**File:** `components/layout/Navbar.tsx`
**Type:** Client Component (`"use client"` — needs `usePathname`)
**Props:** `user?: { name?: string; email: string } | null` — passed by the server parent (homepage, dashboard shell) so the navbar reflects auth state.
**Key classes:**
- Header: `w-full bg-surface border-b border-border h-16 flex items-center px-6`
- Inner wrapper: `w-full max-w-[1440px] mx-auto flex items-center justify-between`
- Logo box: `w-9 h-9 rounded-[10px]` + inline gradient style
- Logo text: `font-bold text-text-darkest` + inline `fontSize: 19`
- Nav link active: `text-accent` (className conditional)
- Nav link inactive: `text-text-nav` (className conditional)
- CTA slot (logged out): `text-sm font-medium px-4 py-2 rounded-md text-accent-foreground` + inline gradient style → "Start for free" linking to `/login`
- CTA slot (logged in): `flex items-center gap-3` wrapping the user name/email (`hidden sm:block text-sm font-medium text-text-primary max-w-[180px] truncate`) + `<LogoutButton />`

---

### LogoutButton
**File:** `components/layout/LogoutButton.tsx`
**Type:** Client Component (`"use client"` — onClick handler, router, posthog)
**Behavior:** `POST /api/auth/logout` (server-side revoke + cookie clear) → `posthog.reset()` → `router.push("/")` + `router.refresh()`. Has a `loading` state ("Signing out…").
**Implementation:** Uses the shadcn `<Button variant="secondary">` primitive (no longer hand-rolled). Icon: `LogOut` from lucide-react, `w-4 h-4`.

---

### DashboardLayout (authenticated app shell)
**File:** `app/dashboard/layout.tsx`
**Type:** Server Component (async — calls `getCurrentUser()`)
**Purpose:** Renders the auth-aware `<Navbar user={user} />` above protected page content. `/profile` and `/find-jobs` should adopt this same shell when built.
**Key classes:**
- Wrapper: `min-h-screen flex flex-col bg-background`
- Main: `flex-1 flex flex-col`

---

### Footer
**File:** `components/layout/Footer.tsx`
**Type:** Server Component
**Key classes:**
- Wrapper: `w-full bg-surface border-t border-border mt-auto`
- Inner: `w-full max-w-[1440px] mx-auto px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6`
- Links: `text-sm text-text-secondary hover:text-text-primary transition-colors`

---

### Hero
**File:** `components/homepage/Hero.tsx`
**Type:** Server Component
**Key classes:**
- Section: `w-full bg-background pt-20 pb-0 px-8`
- Inner: `w-full max-w-[1440px] mx-auto flex flex-col items-center text-center`
- Headline: `font-bold tracking-tight max-w-2xl mb-5` + inline `fontSize: 56, lineHeight: 64px`
- Primary CTA: `flex items-center gap-2 px-6 py-3 rounded-md text-sm font-medium text-accent-foreground` + inline gradient
- Secondary CTA: `px-6 py-3 rounded-md text-sm font-medium bg-surface border border-border text-text-primary hover:bg-surface-secondary`
- Dashboard image: `w-full max-w-5xl` → `next/image` with `rounded-t-2xl border border-b-0 border-border shadow-xl`

---

### HowItWorks
**File:** `components/homepage/HowItWorks.tsx`
**Type:** Server Component
**Layout:** Two-column — text+features left, `jobs-lists.png` screenshot right
**Key classes:**
- Section: `w-full bg-surface py-20 px-8 border-y border-border`
- Grid: `grid grid-cols-1 lg:grid-cols-2 gap-16 items-center`
- Heading: `font-semibold text-text-primary mb-12` + inline `fontSize: 36, lineHeight: 44px`
- Feature row: `flex gap-4`
- Icon box: `w-10 h-10 rounded-xl` + inline `background: var(--color-accent-muted)`
- Image wrapper: `rounded-2xl overflow-hidden border border-border shadow-lg`

---

### Features
**File:** `components/homepage/Features.tsx`
**Type:** Server Component
**Layout:** Two-column — `agnet-log.png` screenshot left, text+features right
**Key classes:**
- Section: `w-full bg-background py-20 px-8`
- Grid: `grid grid-cols-1 lg:grid-cols-2 gap-16 items-center`
- Heading: `font-semibold text-text-primary mb-4` + inline `fontSize: 36, lineHeight: 44px`
- Feature row: `flex gap-4`
- Icon box: `w-10 h-10 rounded-xl` + inline `background: var(--color-accent-muted)`
- Image wrapper: `rounded-2xl overflow-hidden border border-border shadow-lg`

---

### Testimonial
**File:** `components/homepage/Testimonial.tsx`
**Type:** Server Component
**Key classes:**
- Section: `w-full bg-surface border-t border-border py-20 px-8`
- Card: `w-full max-w-2xl bg-surface rounded-2xl border border-border px-10 pt-8 pb-10` + box-shadow inline
- Decorative quote: inline `fontSize: 72, fontFamily: Georgia, opacity: 0.25, color: accent`
- Quote text: inline `fontSize: 18, lineHeight: 30px, fontWeight: 500`
- Avatar: `w-10 h-10 rounded-full overflow-hidden border border-border` + `next/image`

---

### LoginPage
**File:** `app/login/page.tsx`
**Type:** Client Component (`"use client"` — needs onClick handlers for OAuth)
**Key classes:**
- Page wrapper: `min-h-screen bg-background flex items-center justify-center px-4`
- Card: `bg-surface border border-border rounded-2xl p-8 w-full max-w-md shadow-sm`
- Logo box: `w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0` + inline gradient style
- Logo text: `font-bold text-text-darkest` + inline `fontSize: 19`
- Heading: `text-2xl font-semibold text-text-primary text-center mb-2`
- Subtext: `text-text-secondary text-center text-sm mb-8`
- Error banner: `mb-4 px-4 py-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm text-center`
- OAuth button: `flex items-center justify-center gap-3 w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary font-medium text-sm hover:bg-surface-secondary transition-colors disabled:opacity-60 disabled:cursor-not-allowed`
- Fine print: `text-center text-text-muted text-xs mt-8`

---

### AuthCallbackPage
**File:** `app/auth/callback/page.tsx`
**Type:** Client Component (`"use client"` — posts code to server exchange route then redirects)
**Key classes:**
- Page wrapper: `min-h-screen bg-background flex items-center justify-center px-4`
- Card: `bg-surface border border-border rounded-2xl p-8 w-full max-w-xs shadow-sm flex flex-col items-center gap-5`
- Logo box: `w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0` + inline gradient
- Spinner: `w-7 h-7 rounded-full border-2 border-t-transparent animate-spin` + inline border-color accent
- Message: `text-text-secondary text-sm text-center`

---

### BottomCTA
**File:** `components/homepage/BottomCTA.tsx`
**Type:** Server Component
**Key classes:**
- Section: `w-full py-20 px-8`
- CTA block: `rounded-2xl px-12 py-20 flex flex-col items-center text-center gap-5` + inline gradient `135deg accent → accent-deeper`
- Headline: `font-bold text-accent-foreground max-w-lg` + inline `fontSize: 40, lineHeight: 50px`
- CTA button: `flex items-center gap-2 px-8 py-3.5 rounded-md text-sm font-medium bg-surface text-accent`

---

## shadcn/ui Primitives (feature 05)

Hand-authored shadcn primitives in `components/ui/`, styled directly to project tokens (NOT shadcn's
default neutral palette). Use these everywhere instead of raw `<input>`/`<select>` etc. See the shadcn
setup note in `code-standards.md` before adding a new primitive.

- **Button** (`components/ui/button.tsx`) — `cva` variants: `default` (`bg-accent text-accent-foreground hover:bg-accent-dark`), `secondary` (`bg-surface border border-border hover:bg-surface-secondary`), `ghost`, `outline`. Sizes `default/sm/lg/icon`. Focus ring `ring-accent`. Auto-sizes inner lucide icons to `size-4`.
- **Input** (`components/ui/input.tsx`) — `h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:ring-1 focus-visible:ring-accent focus-visible:border-accent`.
- **Textarea** (`components/ui/textarea.tsx`) — same as Input, `min-h-20`.
- **Label** (`components/ui/label.tsx`, Radix) — `text-sm font-medium text-text-secondary`.
- **Select** (`components/ui/select.tsx`, Radix) — Trigger matches Input styling, `data-[placeholder]:text-text-muted`, `ChevronDown` icon `text-text-muted`; Content `bg-surface border border-border rounded-md shadow-md`; Item `focus:bg-surface-secondary`, check indicator `text-accent`.
- **Checkbox** (`components/ui/checkbox.tsx`, Radix) — `h-4 w-4 rounded-sm border border-border`; checked → `bg-accent border-accent text-accent-foreground` with `Check` icon.

---

## Profile Components (feature 05)

All under `components/profile/`. The page (`app/profile/page.tsx`) is a Server Component that reads the
real email via `getCurrentUser()` and passes a partially-filled mock `Profile` (`types/index.ts`) into
the form. Form save is inert until feature 06.

### CompletionIndicator
**File:** `components/profile/CompletionIndicator.tsx`
**Type:** Server Component (presentational — receives `percentage` + `missingFields`)
**Pattern:** "Needs attention" banner card with an SVG completion ring.
**Key classes:**
- Card: `w-full bg-surface border border-border rounded-2xl p-6 flex items-center gap-6` + the standard card box-shadow (inline `shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]`)
- Ring: `<svg>` `-rotate-90`, two `<circle r=30 strokeWidth=6>` — track `stroke-border-light`, progress `stroke-accent` (or `stroke-success` at 100%) via `strokeDasharray`/`strokeDashoffset`. Center `%` overlaid absolute.
- Missing-field pills: `px-2 py-0.5 rounded-full text-xs font-medium bg-accent-muted text-accent uppercase tracking-wide`
- Complete state: `CheckCircle2 text-success` + heading.

### TagInput
**File:** `components/profile/TagInput.tsx`
**Type:** Client Component (`"use client"` — local draft state)
**Pattern:** Chip input — text field + Add button (Enter also adds); chips below with remove `X`. Reused for Skills, Industries, Job Titles Seeking, Preferred Locations.
**Key classes:**
- Row: `flex gap-2` (Input + secondary Button)
- Chip: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-light text-accent`

### WorkExperienceCard
**File:** `components/profile/WorkExperienceCard.tsx`
**Type:** Controlled (no hooks — receives `value`/`onChange`/`onRemove`)
**Pattern:** One work-experience role (used up to 3×). Company/Title/Start/End in a 2-col grid, "I currently work here" Checkbox (disables End Date), Responsibilities Textarea, `Trash2` remove.
**Key classes:**
- Wrapper: `rounded-lg border border-border p-4 flex flex-col gap-4`
- Field grid: `grid grid-cols-1 sm:grid-cols-2 gap-4`
- Remove: `text-text-muted hover:text-error`

### ResumeUpload
**File:** `components/profile/ResumeUpload.tsx`
**Type:** Client Component (`"use client"` — drag state, hidden file input, `useTransition`)
**Behavior (feature 06):** On PDF select/drop → validates type → `uploadResume(formData)` Server Action → uploads to the **private** `resumes` bucket. Props: `initialResumePath?: string`. Shows a "Resume on file" row with a **View** link to `GET /api/resume` (the authenticated stream) when a resume exists; "Uploading…" during the transition; inline error banner on failure. "Generate Resume from Profile" button still inert (feature 08).
**Key classes:**
- Card: standard surface card (see CompletionIndicator)
- Current-resume row: `flex items-center justify-between rounded-lg border border-border bg-surface-secondary px-4 py-3`; View link `text-accent hover:text-accent-dark`
- Drop zone idle: `rounded-lg border border-dashed border-border-muted bg-surface-secondary hover:bg-surface-tertiary px-6 py-10`; dragging: `border-accent bg-accent-muted`
- Error banner: `rounded-lg border border-error/30 bg-error/10 text-error px-4 py-3 text-sm font-medium`
- Icons: `UploadCloud`/`FileText`/`Sparkles`/`ExternalLink` from lucide

### ProfileForm
**File:** `components/profile/ProfileForm.tsx`
**Type:** Client Component (`"use client"` — owns all form state, live completion calc)
**Pattern:** Orchestrates the whole page below the heading: CompletionIndicator → ResumeUpload → 5 `Section` cards (Personal, Professional, Work Experience, Education, Job Preferences) → right-aligned Save Profile button (inert, feature 06). Uses local non-exported `Section` (card) and `Field` (Label + control) helpers.
**Key classes:**
- Page stack: `flex flex-col gap-6`
- `Section` card: `w-full bg-surface border border-border rounded-2xl p-6 flex flex-col gap-5` + card box-shadow; title `text-base font-semibold text-text-primary`
- `Field`: `flex flex-col gap-1.5` (Label above control)
- Two-column field grid: `grid grid-cols-1 sm:grid-cols-2 gap-4`
**Page container** (`app/profile/page.tsx`): `w-full max-w-3xl mx-auto px-8 py-8 flex flex-col gap-6` (narrower than the 1440px marketing pages — forms read better centered).
