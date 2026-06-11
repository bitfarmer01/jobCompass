import OpenAI from "openai";

import { nim } from "@/lib/nim-client";
import type { ExtractedProfile } from "@/types";

const NIM_MODEL = "nvidia/nemotron-3-ultra-550b-a55b";

// NIM-specific params extend the OpenAI streaming type with reasoning controls
type NIMStreamParams = OpenAI.Chat.ChatCompletionCreateParamsStreaming & {
  reasoning_budget?: number;
  chat_template_kwargs?: Record<string, unknown>;
};

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
      temperature: 1,
      top_p: 0.95,
      max_tokens: 16384,
      reasoning_budget: 16384,
      chat_template_kwargs: { enable_thinking: true },
      stream: true,
    };

    const stream = await nim.chat.completions.create(
      // NIMStreamParams extends the standard type; cast satisfies overload resolution
      // while extra fields (reasoning_budget, chat_template_kwargs) pass through in the body
      params as OpenAI.Chat.ChatCompletionCreateParamsStreaming,
    );

    let content = "";
    for await (const chunk of stream) {
      content += chunk.choices[0]?.delta?.content ?? "";
    }

    const trimmed = content.trim();
    // Strip <think>…</think> reasoning block that NIM emits before the JSON
    const withoutThink = trimmed.replace(/^<think>[\s\S]*?<\/think>\s*/i, "").trim();
    const jsonStr = withoutThink.startsWith("```")
      ? withoutThink.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
      : withoutThink;

    const data = JSON.parse(jsonStr) as ExtractedProfile;
    return { success: true, data };
  } catch (error) {
    console.error("[agent/extractor]", error);
    return { success: false, error: "Failed to extract profile from resume." };
  }
}
