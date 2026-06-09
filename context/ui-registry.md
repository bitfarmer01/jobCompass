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
**Behavior:** `POST /api/auth/logout` → `posthog.reset()` → `router.push("/")` + `router.refresh()`. Has a `loading` state ("Signing out…").
**Key classes:**
- Button (secondary pattern): `flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md bg-surface border border-border text-text-primary hover:bg-surface-secondary transition-colors disabled:opacity-60 disabled:cursor-not-allowed`
- Icon: `LogOut` from lucide-react, `w-4 h-4`

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
