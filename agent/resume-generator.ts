import { streamNimContent, type NIMStreamParams } from "@/lib/nim-client";
import type { GeneratedResumeContent, Profile } from "@/types";

// Decision (2026-06-11): the 9b text model is sufficient for resume-writing
// quality and noticeably faster than the 30b alternative. See library-docs.md → NVIDIA NIM.
const NIM_MODEL = "nvidia/nvidia-nemotron-nano-9b-v2";

const SYSTEM_PROMPT = `You are a professional resume writer. Given a candidate's profile data, generate polished resume content.

Return ONLY valid JSON — no markdown, no code fences, no explanation. The JSON must match this exact shape:
{
  "summary": string (2-3 sentence professional summary written in first person, highlighting years of experience, key strengths, and career focus),
  "workExperience": array of roles matching the input work_experience order [{
    "company": string (same company from input),
    "jobTitle": string (same job title from input),
    "startDate": string (same start_date from input),
    "endDate": string (same end_date from input, empty string if current),
    "current": boolean (same current from input),
    "bullets": string[] (3-5 concise action-verb bullet points describing key achievements and responsibilities — use strong verbs like Led, Built, Reduced, Improved, Designed, Shipped)
  }]
}

Rules:
- Write the summary in first person ("I bring..." or start with a noun phrase like "Experienced software engineer...")
- Each bullet must start with a past-tense action verb for past roles, present-tense for current roles
- Bullets must be specific and impact-focused — quantify where possible based on the input
- Never invent company names, titles, or dates — only use what is provided
- If work_experience is empty, return an empty workExperience array and write the summary from the other profile fields
- Return exactly one JSON object — no other text whatsoever`;

export async function generateResumeContent(
  profile: Profile,
): Promise<{ success: boolean; data?: GeneratedResumeContent; error?: string }> {
  if (!profile.full_name?.trim()) {
    return { success: false, error: "Profile must have a name before generating a resume." };
  }

  const userPrompt = `Generate professional resume content for this candidate:

Name: ${profile.full_name}
Current Title: ${profile.current_title || "Not specified"}
Experience Level: ${profile.experience_level || "Not specified"}
Years of Experience: ${profile.years_experience || "Not specified"}
Skills: ${profile.skills?.join(", ") || "None listed"}
Industries: ${profile.industries?.join(", ") || "None listed"}

Work Experience:
${profile.work_experience?.length
      ? JSON.stringify(profile.work_experience, null, 2)
      : "No work experience provided"
    }

Education:
${profile.education?.length
      ? JSON.stringify(profile.education, null, 2)
      : "No education provided"
    }`;

  try {
    const params: NIMStreamParams = {
      model: NIM_MODEL,
      messages: [
        // "/no_think" is what actually disables reasoning on nemotron-nano-9b-v2 —
        // its chat template ignores chat_template_kwargs (verified against the live
        // endpoint: the kwarg alone still streamed chain-of-thought). Keeps the 9b
        // fast and its output a single clean JSON object.
        { role: "system", content: `/no_think\n\n${SYSTEM_PROMPT}` },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      top_p: 0.95,
      max_tokens: 4096,
      // Writing resume JSON needs no chain-of-thought, so thinking is disabled to keep
      // latency low (the "/no_think" directive above is what the 9b honors). This kwarg
      // disables thinking on the nemotron-3 family and is a harmless no-op on the 9b —
      // kept as a cross-model safeguard if the model constant is swapped.
      chat_template_kwargs: { enable_thinking: false },
      stream: true,
    };

    const content = await streamNimContent(params);
    const parsed = JSON.parse(content) as GeneratedResumeContent;

    // Defensive normalization — a small model can emit stray whitespace, blank fields,
    // or empty bullets. Clean here so the PDF never renders artifacts like a dangling
    // ", Company" or an orphan bullet dot, no matter how sloppy the model output is.
    const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const data: GeneratedResumeContent = {
      summary: clean(parsed.summary),
      workExperience: (Array.isArray(parsed.workExperience) ? parsed.workExperience : [])
        .filter(Boolean)
        .map((role) => ({
          company: clean(role.company),
          jobTitle: clean(role.jobTitle),
          startDate: clean(role.startDate),
          endDate: clean(role.endDate),
          current: Boolean(role.current),
          bullets: (Array.isArray(role.bullets) ? role.bullets : []).map(clean).filter(Boolean),
        }))
        .filter((role) => role.company || role.jobTitle || role.bullets.length),
    };
    return { success: true, data };
  } catch (error) {
    // Log the raw error server-side; never surface provider/parse internals to the user.
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[agent/resume-generator]", msg);
    return {
      success: false,
      error: "Failed to generate resume content. Please try again.",
    };
  }
}
