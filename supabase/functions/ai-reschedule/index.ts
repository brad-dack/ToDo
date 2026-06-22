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
        `Each task has an id, title, duration (minutes), current due_date, an optional goal_deadline, ` +
        `and importance (1-10). ` +
        `\n\nIMPORTANCE IS THE TOP PRIORITY. Higher-importance tasks must get earlier slots. ` +
        `If a high-importance task and a low-importance task are competing for the same date's ` +
        `remaining capacity, always place the higher-importance task earlier — even if it means ` +
        `pushing the lower-importance task later (as long as that doesn't breach its goal_deadline). ` +
        `\n\nReschedule tasks that are overdue or piled up onto dates from ${today} onward with spare ` +
        `capacity. dayLimits gives total minutes available per weekday (sun-sat), existingLoad lists ` +
        `minutes already committed on specific dates (from other tasks, not these ones), and overrides ` +
        `lists per-date capacity overrides (a limit of 0 means that date is unavailable). ` +
        `\n\nAlso bring tasks FORWARD if there is spare capacity on an earlier date (from ${today} ` +
        `onward), prioritising higher-importance tasks first. Fill earlier days before later days, ` +
        `never before ${today}. ` +
        `\n\nGUARDRAILS for bringing forward: ` +
        `(1) Never pull a task more than 28 days earlier than its current due_date — a task set for ` +
        `late December must not land in November just because June has spare capacity. ` +
        `(2) Only displace a lower-importance task to a later date to make room for a higher-importance ` +
        `task if their importance scores differ by MORE than 3 points (e.g. importance 8 can displace ` +
        `importance 4, but importance 6 cannot displace importance 4). Never displace a task past its ` +
        `goal_deadline. ` +
        `Never set any task's due_date later than its goal_deadline if one is given. Don't schedule ` +
        `more total minutes onto a date than its remaining capacity allows (accounting for existingLoad ` +
        `and the other tasks you've already placed on that date). ` +
        `\n\nOnly include tasks in the result that actually change date. If nothing needs to change, ` +
        `return an empty moves array. ` +
        `\n\nThe summary must be ONE short sentence (max 12 words). Example: "Moved 4 tasks forward, prioritising your top projects." ` +
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
            summary: { type: "string", description: "One sentence, max 12 words, e.g. 'Moved 3 tasks forward, prioritising your top projects.'" },
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
