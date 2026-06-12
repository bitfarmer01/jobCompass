const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";

export type NIMStreamParams = {
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream: true;
  reasoning_budget?: number;
  chat_template_kwargs?: Record<string, unknown>;
};

export async function streamNimContent(params: NIMStreamParams): Promise<string> {
  const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NIM_API_KEY!}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) throw new Error(`NIM error ${res.status}: ${await res.text()}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let content = "";
  // SSE events can split across network chunks — buffer the trailing partial
  // line, or JSON.parse would throw on a half-delivered event.
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // keep the (possibly partial) last line
    for (const line of lines) {
      if (!line.startsWith("data: ") || line.startsWith("data: [DONE]")) {
        continue;
      }
      const delta = JSON.parse(line.slice(6))?.choices?.[0]?.delta?.content;
      if (delta) content += delta;
    }
  }

  const withoutThink = content
    .trim()
    .replace(/^<think>[\s\S]*?<\/think>\s*/i, "")
    .trim();
  return withoutThink.startsWith("```")
    ? withoutThink.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    : withoutThink;
}
