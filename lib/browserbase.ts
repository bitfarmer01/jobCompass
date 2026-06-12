import Browserbase from "@browserbasehq/sdk";

// Browserbase client lives here per library-docs.md — always import from this
// module, never construct inline.
export const bb = new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY!,
});

// One research run = one session (homepage + max 3 sub-pages, visited
// sequentially). 120s timeout bounds a hung page without capping the route.
export async function createResearchSession() {
  return bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    timeout: 120,
  });
}
