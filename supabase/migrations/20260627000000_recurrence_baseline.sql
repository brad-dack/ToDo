-- Recurrence baseline columns
--
-- For recurring projects, the *next* occurrence must be generated from a fixed
-- cadence, not from whatever date the current occurrence ended up on. Pushing or
-- editing a date should only affect the current cycle.
--
-- base_due_date / base_goal_deadline capture the original (immutable) schedule.
-- They are set when a project is created and when a recurrence is generated, and
-- are intentionally left untouched by pushes, edits and reschedules.

alter table subtasks
  add column if not exists base_due_date date;

alter table subtasks
  add column if not exists base_goal_deadline date;

-- Backfill existing rows so the first post-deploy recurrence has an anchor to
-- shift from (falls back to the current live dates).
update subtasks set base_due_date = due_date where base_due_date is null;
update subtasks set base_goal_deadline = goal_deadline where base_goal_deadline is null and goal_deadline is not null;
