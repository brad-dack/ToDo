import { callClaudeForJSON, CORS_HEADERS } from "../_shared/anthropic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { goal, deadline, today, steps, dayLimits, existingLoad, overrides } = await req.json();
    if (!goal || !deadline || !today || !Array.isArray(steps) || !steps.length) {
      return new Response(JSON.stringify({ error: "goal, deadline, today and a non-empty steps array are required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "content-type": "application/json" },
      });
    }

    const result = await callClaudeForJSON({
      model: "claude-sonnet-4-6",
      maxTokens: 1200,
      system:
        `You help recover a personal project that has fallen behind schedule for a 15-minute task ` +
        `planner. Today is ${today}. The project "${goal}" has a deadline of ${deadline} and is at ` +
        `risk of missing it given the remaining steps and available capacity. ` +
        `\n\nThe steps below are this project's remaining (incomplete) tasks, each with an id, title, ` +
        `duration (minutes), and current due_date. Re-sequence and reschedule these steps onto the best ` +
        `available dates between ${today} and ${deadline}, prioritizing the most important or blocking ` +
        `work first. dayLimits gives total minutes available per weekday (sun-sat), existingLoad lists ` +
        `minutes already committed on specific dates by OTHER projects, and overrides lists per-date ` +
        `capacity overrides (a limit of 0 means that date is unavailable). Don't schedule more total ` +
        `minutes onto a date than its remaining capacity allows (accounting for existingLoad and the ` +
        `other steps you've already placed on that date). ` +
        `\n\nIf all steps genuinely cannot fit before ${deadline} given available capacity, schedule the ` +
        `overflow steps as close to ${deadline} as possible (do not invent dates after the deadline) and ` +
        `mention in the summary that the deadline may need to be extended. ` +
        `\n\nReturn a move for every step (even ones whose due_date doesn't change), so the full plan is ` +
        `represented. ` +
        `\n\ndayLimits: ${JSON.stringify(dayLimits)}` +
        `\nexistingLoad: ${JSON.stringify(existingLoad)}` +
        `\noverrides: ${JSON.stringify(overrides)}`,
      messages: [{ role: "user", content: `steps: ${JSON.stringify(steps)}` }],
      tool: {
        name: "recover_project",
        description: "Record the recovery plan",
        input_schema: {
          type: "object",
          properties: {
            summary: { type: "string", description: "1-2 sentence plain-text explanation of the recovery approach" },
            moves: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  due_date: { type: "string", description: "YYYY-MM-DD" },
                },
                required: ["id", "due_date"],
              },
            },
          },
          required: ["summary", "moves"],
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
