import { callClaudeForJSON, CORS_HEADERS } from "../_shared/anthropic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { goal, deadline, today, dayLimits, existingLoad, overrides } = await req.json();
    if (!goal || !deadline || !today) {
      return new Response(JSON.stringify({ error: "goal, deadline and today are required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "content-type": "application/json" },
      });
    }

    const result = await callClaudeForJSON({
      model: "claude-sonnet-4-6",
      maxTokens: 1200,
      system:
        `You help break a personal project goal into a sequence of concrete, actionable steps for a ` +
        `15-minute task planner. Today is ${today}. The project deadline is ${deadline}. ` +
        `Each step must take 15 minutes or less and must have a due_date between ${today} and ${deadline} inclusive. ` +
        `Order steps logically (setup/preparation steps before steps that depend on them). ` +
        `\n\nSchedule steps onto dates with spare capacity: dayLimits gives the total minutes available ` +
        `per weekday (sun-sat), existingLoad lists minutes already committed on specific dates, and ` +
        `overrides lists per-date capacity overrides (a limit of 0 means that date is unavailable). ` +
        `Prefer days with more remaining capacity (limit minus existing load minus minutes you've already ` +
        `scheduled for that date). Don't schedule more steps onto a date than its remaining capacity allows. ` +
        `\n\nAlso rate the project's importance from 1 (trivial) to 10 (critical) based on the goal's wording ` +
        `and how tight the deadline is.` +
        `\n\nConsolidate related actions into a small number of meaningful steps - aim for 4-8 steps total ` +
        `for the whole project, not an exhaustive micro-breakdown of every individual action.` +
        `\n\ndayLimits: ${JSON.stringify(dayLimits)}` +
        `\nexistingLoad: ${JSON.stringify(existingLoad)}` +
        `\noverrides: ${JSON.stringify(overrides)}`,
      messages: [{ role: "user", content: `Project goal: ${goal}` }],
      tool: {
        name: "plan_project",
        description: "Record the project breakdown",
        input_schema: {
          type: "object",
          properties: {
            importance: { type: "integer", minimum: 1, maximum: 10 },
            steps: {
              type: "array",
              minItems: 1,
              maxItems: 8,
              items: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Short, clear action title" },
                  due_date: { type: "string", description: "YYYY-MM-DD" },
                  duration: { type: "integer", minimum: 1, maximum: 15 },
                },
                required: ["title", "due_date", "duration"],
              },
            },
          },
          required: ["importance", "steps"],
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
