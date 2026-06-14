const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CallClaudeOptions {
  model: string;
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  tool: {
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  };
}

// Calls Claude with a forced tool call so the response is guaranteed structured JSON.
export async function callClaudeForJSON(opts: CallClaudeOptions): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 512,
      system: opts.system,
      messages: opts.messages,
      tools: [
        {
          name: opts.tool.name,
          description: opts.tool.description,
          input_schema: opts.tool.input_schema,
        },
      ],
      tool_choice: { type: "tool", name: opts.tool.name },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  if (data.usage) {
    console.log(`[claude usage] model=${opts.model} tool=${opts.tool.name} input_tokens=${data.usage.input_tokens} output_tokens=${data.usage.output_tokens}`);
  }
  const toolUse = (data.content || []).find((b: { type: string }) => b.type === "tool_use");
  if (!toolUse) throw new Error("Claude did not return a tool call");
  return toolUse.input as Record<string, unknown>;
}
