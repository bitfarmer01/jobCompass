import Browserbase from "@browserbasehq/sdk";

// Browserbase client lives here per library-docs.md — always import from this
// module, never construct inline.
export const bb = new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY!,
});

// One research run = one session, used only as the JS-shell fallback (no LLM
// attached — page text is read via evaluate, so it completes in seconds).
// 300s headroom: the first live run proved 120s dies mid-run when anything
// is slow, and an idle-after-close session costs nothing.
export async function createResearchSession() {
  return bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    timeout: 300,
  });
}
