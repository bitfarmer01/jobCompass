import OpenAI from "openai";

export const nim = new OpenAI({
  apiKey: process.env.NIM_API_KEY!,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

// NIM-specific params extend the OpenAI streaming type with reasoning controls
export type NIMStreamParams =
  OpenAI.Chat.ChatCompletionCreateParamsStreaming & {
    reasoning_budget?: number;
    chat_template_kwargs?: Record<string, unknown>;
  };

// Streams a NIM chat completion and returns the concatenated final content,
// stripped of <think>…</think> reasoning blocks and markdown code fences —
// ready for JSON.parse. Collects only delta.content (never reasoning_content).
export async function streamNimContent(
  params: NIMStreamParams,
): Promise<string> {
  const stream = await nim.chat.completions.create(
    // NIMStreamParams extends the standard type; cast satisfies overload resolution
    // while extra fields (reasoning_budget, chat_template_kwargs) pass through in the body
    params as OpenAI.Chat.ChatCompletionCreateParamsStreaming,
  );

  let content = "";
  for await (const chunk of stream) {
    content += chunk.choices[0]?.delta?.content ?? "";
  }

  const withoutThink = content
    .trim()
    .replace(/^<think>[\s\S]*?<\/think>\s*/i, "")
    .trim();
  return withoutThink.startsWith("```")
    ? withoutThink.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    : withoutThink;
}
