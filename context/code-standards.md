# Code Standards

Implementation rules and conventions for the entire project. The AI agent must follow these in every session without exception. These rules prevent pattern drift across sessions.

---

## Engineering Mindset

The AI agent on this project operates as a senior engineer. This means:

- **Think before implementing** — understand what is being built and why before writing a single line
- **Read context files first** — never assume, always verify against architecture.md and project-overview.md
- **Scope is sacred** — only build what the current feature requires. Never go beyond scope even if it seems helpful
- **Every feature must be testable** — if it cannot be verified immediately after implementation, it is incomplete
- **Clean over clever** — simple readable code that a junior developer can understand is always preferred over clever abstractions
- **One thing at a time** — complete one feature fully before touching the next
- **Failures are expected** — wrap agent operations in try/catch, log failures, never let one failure crash everything

---

## TypeScript

- Strict mode enabled in tsconfig.json — no exceptions
- Never use `any` — use `unknown` and narrow the type
- Never use type assertions (`as SomeType`) unless absolutely necessary and commented why
- All function parameters and return types must be explicitly typed
- Use `type` for object shapes and unions — use `interface` only for extendable component props
- All async functions must have proper error handling — never let promises float unhandled
- Use `const` by default — only use `let` when reassignment is necessary

---

## Next.js 16 Conventions

- App Router only — no Pages Router
- React 19 — use React 19 APIs throughout
- All components are Server Components by default
- Only add `"use client"` when the component requires:
  - useState or useReducer
  - useEffect
  - Browser APIs
  - Event listeners
  - Third party client-only libraries (PostHog browser side)
- Never add `"use client"` to layout files unless absolutely required
- Data fetching happens in Server Components — never fetch in Client Components directly
- Route handlers live in `app/api/` — never put business logic directly in route handlers
- Server Actions live in `actions/` — never define Server Actions inline in components
- Caching is uncached by default — all dynamic code runs at request time
- Always read Next.js documentation before implementing any Next.js specific feature — APIs may differ from training data

---

## File and Folder Naming

- Folders: kebab-case — `job-details`, `agent-controls`
- Component files: PascalCase — `StatsBar.tsx`, `RecentActivity.tsx`
- Utility files: camelCase — `browserbase.ts`, `posthog-client.ts`
- Type files: camelCase — `index.ts`
- API route files: always `route.ts`
- Server Action files: camelCase — `profile.ts`, `jobs.ts`
- One component per file — never export multiple components from one file
- Index files only in `components/ui/` — never barrel export from other folders

---

## Component Structure

Every component follows this exact order:

```typescript
"use client"; // only if needed

// 1. External imports
import { useState } from "react";
import { Button } from "@/components/ui/button";

// 2. Internal imports
import { StatsCard } from "@/components/dashboard/StatsCard";

// 3. Type definitions
type Props = {
  jobId: string;
  matchScore: number;
};

// 4. Component
export function ComponentName({ jobId, matchScore }: Props) {
  // state
  // derived values
  // handlers
  // return JSX
}
```

- Never use default exports for components — always named exports
- Props type defined directly above the component — not in a separate types file unless shared
- No inline styles — all styling via Tailwind classes using CSS variables from ui-tokens.md

---

## API Route Handlers

```typescript
// app/api/agent/find/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // validate body
    // call agent function
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[agent/find]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- Every route handler has a try/catch
- Every route handler validates the request body before processing
- Errors are logged with the route path as prefix: `[agent/find]`
- Always return `{ success: boolean, data?: T, error?: string }`
- Never return raw data without the success wrapper

---

## Server Actions

```typescript
// actions/profile.ts

"use server";

import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";

export async function saveProfile(formData: ProfileFormData) {
  try {
    const insforge = await createInsforgeServer();
    // validate
    // write to DB
    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("[actions/profile]", error);
    return { success: false, error: "Failed to save profile" };
  }
}
```

- Every Server Action has a try/catch
- Every Server Action returns `{ success: boolean, error?: string }`
- Always call `revalidatePath` after mutations that affect page data
- Never throw from Server Actions — always return the error

---

## Agent Code

```typescript
// agent/adzuna.ts
import { logAgent } from "@/lib/agent-logs";

export async function discoverJobs(
  jobTitle: string,
  location: string,
  profile: Profile,
  userId: string,
  runId: string,
): Promise<{ success: boolean; data?: { records: JobInsert[]; totalFound: number }; error?: string }> {
  try {
    // implementation
    return { success: true, data: { records, totalFound } };
  } catch (error) {
    console.error("[agent/adzuna]", error); // raw error stays server-side
    await logAgent({ runId, userId, level: "error", message: "Job discovery failed" });
    return { success: false, error: "Job search failed. Please try again." };
  }
}
```

- Every agent function returns `{ success: boolean, data?, error?: string }`
- Every agent function has a try/catch — never let one failure crash the run
- Errors are always logged to agent_logs via `logAgent` from `lib/agent-logs.ts` before returning — `logAgent` is best-effort and never throws; its `message` is human readable (it feeds the dashboard recent-activity feed)
- The returned `error` string is friendly/user-facing; the raw error goes to `console.error` only
- Agent functions never import from `components/` or `actions/`
- Agent functions never use React hooks or browser APIs

---

## InsForge Client Usage

```typescript
// Browser context — Client Components only
import { insforge } from "@/lib/insforge-client";

// Server context — Server Components, Route Handlers, Server Actions, Agent
import { createInsforgeServer } from "@/lib/insforge-server";
const insforge = await createInsforgeServer();
```

- Never use the browser client in server context
- Never use the server client in browser context
- Always await createInsforgeServer() — it reads cookies asynchronously
- Always scope every query to the current user_id — never query without a user filter

---

## Error Handling

- Never use empty catch blocks — always log or handle
- Console errors always include context prefix: `[component/function name]`
- User-facing errors must be human readable — never expose raw error messages
- Agent errors go to agent_logs table — never surface raw agent errors to the UI
- API route errors return `status: 500` with generic message — never expose internals

---

## PostHog Events

All PostHog events must use these exact event names. Never invent new event names without adding them here first.

| Event                      | When                                             | Key Properties                      |
| -------------------------- | ------------------------------------------------ | ----------------------------------- |
| `job_search_started`       | Find Jobs button clicked                         | userId, jobTitle, location          |
| `job_found`                | Each job discovered and saved                    | userId, source, matchScore          |
| `profile_completed`        | User saves complete profile for first time       | userId                              |
| `company_researched`       | Company research dossier generated               | userId, jobId, company              |
| `login_completed`          | OAuth exchange succeeds and userId is available  | userId                              |
| `resume_uploaded`          | User selects and uploads a PDF resume            | userId                              |
| `resume_extracted`         | AI extraction from uploaded resume completes     | userId, success, fields_extracted   |
| `resume_generated`         | AI PDF generation from profile completes         | userId, success                     |
| `resume_deleted`           | User deletes their resume PDF                    | userId                              |
| `company_research_started` | User clicks Research Company button              | userId, jobId, company              |
| `job_applied`              | User clicks Apply Now (external link)            | userId, jobId, company, match_score |

`job_found` powers the Jobs Found Over Time and Match Score Distribution dashboard charts.
`company_researched` powers the Company Research Activity dashboard chart.
Always fire these with correct properties.

Server-side events (`resume_extracted`, `resume_generated`) must use `createPostHogServer()` from
`@/lib/posthog-server` and call `await posthog.shutdown()` before the route handler returns —
events are silently dropped without it.
Client-side events use `import { posthog } from "@/lib/posthog-client"`.
Every event must include `userId` when the value is available.

---

## Environment Variables

All environment variables defined in `.env.local` for development. Never hardcode any key, URL, or secret anywhere in the codebase.

| Variable                        | Used In                |
| ------------------------------- | ---------------------- |
| `NEXT_PUBLIC_INSFORGE_URL`      | lib/insforge-client.ts |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | lib/insforge-client.ts |
| `BROWSERBASE_API_KEY`           | lib/browserbase.ts     |
| `BROWSERBASE_PROJECT_ID`        | lib/browserbase.ts     |
| `NIM_API_KEY`                   | lib/nim-client.ts      |
| `ADZUNA_ID`                     | lib/adzuna.ts          |
| `ADZUNA_API_KEY`                | lib/adzuna.ts          |
| `NEXT_PUBLIC_POSTHOG_KEY`       | lib/posthog-client.ts  |
| `NEXT_PUBLIC_POSTHOG_HOST`      | lib/posthog-client.ts  |

`NEXT_PUBLIC_` prefix means the variable is exposed to the browser. Never add `NEXT_PUBLIC_` to secret keys.

---

## Match Threshold

The job match threshold is defined once as a constant. Never hardcode this value anywhere else.

```typescript
// lib/utils.ts
export const MATCH_THRESHOLD = 70;
```

Import and use `MATCH_THRESHOLD` everywhere this value is needed.

---

## Import Aliases

Always use the `@/` alias — never use relative imports that go up more than one level.

```typescript
// Correct
import { Button } from "@/components/ui/button";
import { insforge } from "@/lib/insforge-client";
import { MATCH_THRESHOLD } from "@/lib/utils";

// Never
import { Button } from "../../../components/ui/button";
```

---

## Comments

- No comments explaining what the code does — code must be self-explanatory
- Comments only for why — explaining a non-obvious decision
- Agent functions may have a brief comment explaining the Browserbase or Stagehand strategy
- Never leave TODO comments in committed code

---

## Dependencies

Never install a new package without a clear reason. Before installing anything check:

1. Does shadcn/ui already have this component?
2. Does Next.js already provide this functionality?
3. Is there a simpler native solution?

Approved dependencies for this project:

- `@insforge/sdk` — InsForge client (SSR helpers under the `@insforge/sdk/ssr` subpath)
- `@browserbasehq/sdk` — Browserbase sessions
- `@browserbasehq/stagehand` — AI browser control
- `openai` — OpenAI-compatible transport for NVIDIA NIM only (custom baseURL in lib/nim-client.ts) — never used against the OpenAI API
- `posthog-js` — PostHog browser client
- `posthog-node` — PostHog server client
- `@react-pdf/renderer` — Resume PDF generation
- `pdf-parse` — Extract text from uploaded PDF
- `zod` — Schema validation
- `recharts` — Dashboard charts (feature 14). Client-only (`"use client"`); hex color props are the sanctioned exception to the no-hex rule (the library can't read `@theme` tokens) — values come from ui-tokens.md "Dashboard Chart Colors". See library-docs.md.
- `lucide-react` — Icons
- `tailwindcss` — Styling
- `shadcn/ui` components — UI primitives
- `class-variance-authority`, `clsx`, `tailwind-merge` — shadcn primitive styling + `cn` helper
- `@radix-ui/react-slot`, `@radix-ui/react-select`, `@radix-ui/react-checkbox`, `@radix-ui/react-label` — Radix headless primitives behind the shadcn components

Do not install any other packages without updating this list first.

**shadcn setup note (feature 05):** shadcn was **not** initialised via `npx shadcn init` — that would
rewrite `globals.css` and risk clobbering the `@theme` tokens. Instead `components.json` + `lib/utils.ts`
(`cn`) were authored manually and each primitive in `components/ui/` was hand-written and styled directly
to project tokens (`border-border`, `ring-accent`, `bg-surface`, `text-text-primary`,
`placeholder:text-text-muted`). When adding a new shadcn primitive, hand-author it to tokens the same
way — never let the CLI touch `globals.css` or introduce default neutral palette classes.
