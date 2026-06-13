import { callClaudeForJSON, CORS_HEADERS } from "../_shared/anthropic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { today, tasks, dayLimits, existingLoad, overrides } = await req.json();
    if (!today || !Array.isArray(tasks) || !tasks.length) {
      return new Response(JSON.stringify({ error: "today and a non-empty tasks array are required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "content-type": "application/json" },
      });
    }

    const result = await callClaudeForJSON({
      model: "claude-sonnet-4-6",
      maxTokens: 1200,
      system:
        `You help reschedule a personal task list for a 15-minute task planner. Today is ${today}. ` +
        `The tasks list below are overdue or due soon, each with an id, title, duration (minutes), ` +
        `current due_date, an optional goal_deadline (the project deadline this task belongs to, ` +
        `if any), and importance (1-10). ` +
        `\n\nReschedule tasks that are overdue or piled up onto dates from ${today} onward with spare ` +
        `capacity. dayLimits gives total minutes available per weekday (sun-sat), existingLoad lists ` +
        `minutes already committed on specific dates (from other tasks, not these ones), and overrides ` +
        `lists per-date capacity overrides (a limit of 0 means that date is unavailable). Prefer days ` +
        `with more remaining capacity, and prefer moving higher-importance tasks to earlier available ` +
        `slots. Never set a task's due_date later than its goal_deadline if one is given. Don't schedule ` +
        `more total minutes onto a date than its remaining capacity allows (accounting for existingLoad ` +
        `and the other tasks you've already placed on that date). ` +
        `\n\nOnly include tasks in the result that actually need to move - leave tasks alone if their ` +
        `current due_date is already fine (e.g. due today or in the future with no conflict). If nothing ` +
        `needs to change, return an empty moves array. ` +
        `\n\ndayLimits: ${JSON.stringify(dayLimits)}` +
        `\nexistingLoad: ${JSON.stringify(existingLoad)}` +
        `\noverrides: ${JSON.stringify(overrides)}`,
      messages: [{ role: "user", content: `tasks: ${JSON.stringify(tasks)}` }],
      tool: {
        name: "reschedule_tasks",
        description: "Record the rescheduling plan",
        input_schema: {
          type: "object",
          properties: {
            summary: { type: "string", description: "1-2 sentence plain-text explanation of the changes" },
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
