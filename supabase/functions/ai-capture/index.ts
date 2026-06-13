import { callClaudeForJSON, CORS_HEADERS } from "../_shared/anthropic.ts";

const VALID_RULES = ["Daily", "Weekly", "Fortnightly", "Monthly", "Quarterly", "Bi-annually", "Annually"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { text, today } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "content-type": "application/json" },
      });
    }

    const result = await callClaudeForJSON({
      model: "claude-haiku-4-5-20251001",
      maxTokens: 300,
      system:
        `You extract project details from a short free-text description for a personal task planner. ` +
        `Today's date is ${today}. Resolve relative dates ("next month", "in two weeks", "by Friday") ` +
        `against today's date. If no deadline is mentioned or implied, return null for deadline. ` +
        `Rate importance from 1 (trivial) to 10 (critical) based on the wording and any urgency cues. ` +
        `If the text implies a repeating task (e.g. "every fortnight", "mow the lawn"), pick the closest ` +
        `match from: ${VALID_RULES.join(", ")}. Otherwise return null for recurrence. ` +
        `Write the title as a short, clear, actionable project name (rewrite vague phrasing like ` +
        `"do the thing for mum" into something concrete if possible, but don't invent details not implied by the text).`,
      messages: [{ role: "user", content: text }],
      tool: {
        name: "extract_project",
        description: "Record the extracted project details",
        input_schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short, clear project name" },
            deadline: { type: ["string", "null"], description: "YYYY-MM-DD or null if not implied" },
            importance: { type: "integer", minimum: 1, maximum: 10 },
            recurrence: { type: ["string", "null"], enum: [...VALID_RULES, null] },
          },
          required: ["title", "deadline", "importance", "recurrence"],
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
