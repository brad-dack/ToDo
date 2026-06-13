import { callClaudeForJSON, CORS_HEADERS } from "../_shared/anthropic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { completedCount, overdueCount, atRiskCount, activeCount, weekStart, weekEnd } = await req.json();

    const result = await callClaudeForJSON({
      model: "claude-haiku-4-5-20251001",
      maxTokens: 200,
      system:
        `You are a friendly, encouraging productivity coach writing a short weekly recap for a personal ` +
        `task planner app, covering ${weekStart} to ${weekEnd}. Write 1-2 short sentences, plain text, ` +
        `no markdown. Reference the stats naturally (don't just list numbers). Be warm and encouraging ` +
        `about what was completed. If overdueCount or atRiskCount is greater than 0, gently note it and ` +
        `mention that the Premium plan can help suggest a recovery plan - keep this soft, one short clause, ` +
        `not a hard sell. If everything is on track, skip the upsell mention entirely.`,
      messages: [
        {
          role: "user",
          content: JSON.stringify({ completedCount, overdueCount, atRiskCount, activeCount }),
        },
      ],
      tool: {
        name: "write_review",
        description: "Record the weekly review summary",
        input_schema: {
          type: "object",
          properties: {
            summary: { type: "string", description: "1-2 sentence plain-text weekly recap" },
          },
          required: ["summary"],
        },
      },
    });

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  }
});
