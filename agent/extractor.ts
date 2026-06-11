import { streamNimContent, type NIMStreamParams } from "@/lib/nim-client";
import type { ExtractedProfile } from "@/types";

const NIM_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";

const SYSTEM_PROMPT = `You are a precise resume parser. Extract structured profile data from the resume text provided.

Return ONLY valid JSON — no markdown, no code fences, no explanation. The JSON must match this exact shape:
{
  "full_name": string,
  "phone": string,
  "location": string (city and country or state),
  "current_title": string (most recent job title),
  "experience_level": "junior" | "mid" | "senior" | "lead" | "" (junior=0-2yrs, mid=3-5yrs, senior=6-10yrs, lead=10+yrs or explicit lead/staff/principal title),
  "years_experience": string (numeric e.g. "5", empty string if unknown),
  "skills": string[],
  "industries": string[],
  "work_experience": array of up to 3 most recent roles [{
    "company": string,
    "job_title": string,
    "start_date": string (YYYY-MM format),
    "end_date": string (YYYY-MM format, empty string if current),
    "current": boolean,
    "responsibilities": string (key responsibilities as one concise paragraph)
  }],
  "education": array with at most 1 entry [{
    "degree": string,
    "field": string,
    "institution": string,
    "graduation_year": string (4-digit year)
  }],
  "job_titles_seeking": string[],
  "remote_preference": "remote" | "onsite" | "hybrid" | "any" | "",
  "preferred_locations": string[],
  "salary_expectation": string,
  "linkedin_url": string,
  "portfolio_url": string,
  "work_authorization": "citizen" | "permanent_resident" | "visa_required" | ""
}

Rules:
- Use empty string "" for any text field where data is absent
- Use empty array [] for any array field where data is absent
- Never invent data — only extract what is explicitly or clearly implied
- Return exactly one JSON object — no other text whatsoever`;

export async function extractProfileFromResume(
  pdfText: string,
): Promise<{ success: boolean; data?: ExtractedProfile; error?: string }> {
  try {
    const params: NIMStreamParams = {
      model: NIM_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Resume:\n\n${pdfText}` },
      ],
      temperature: 0.2,
      top_p: 0.95,
      // 8192 leaves headroom for dense multi-page resumes — at 4096 the JSON
      // output risked truncation mid-object if reasoning tokens count against
      // the cap, which surfaces as a parse failure.
      max_tokens: 8192,
      reasoning_budget: 1024,
      chat_template_kwargs: { enable_thinking: true },
      stream: true,
    };

    const content = await streamNimContent(params);
    const data = JSON.parse(content) as ExtractedProfile;
    return { success: true, data };
  } catch (error) {
    // Log the raw error server-side; never surface provider/parse internals to the user.
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[agent/extractor]", msg);
    return {
      success: false,
      error: "Failed to extract profile from resume. Please try again.",
    };
  }
}
