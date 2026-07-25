-- Standby pool: committed work that isn't tied to a day yet
--
-- A subtask with due_date = null sits in "Standby". It is still committed work --
-- its parent project keeps a mandatory goal_deadline -- it just has no day yet.
-- Each morning the app allocates today's leftover capacity to the highest-ranked
-- Standby steps, where rank is derived from project deadline pressure rather than
-- chosen by hand. Nothing is picked from Standby manually, by design.
--
-- Previously every step needed a date at creation time, which meant parking work on
-- an arbitrary future day. Those placeholder dates inflated the load figures that
-- dayLimit()/at-risk detection depend on, so days read as full when they weren't.

alter table subtasks alter column due_date drop not null;

-- Times the user has sent an auto-placed step back to Standby, either explicitly
-- ("not today") or passively by leaving it unfinished. Surfaced in the UI so that
-- repeatedly dodging a step becomes visible rather than free.
alter table subtasks add column if not exists defer_count integer not null default 0;

-- Date this step was last auto-placed. Prevents a step deferred this morning from
-- being re-placed by a later refresh on the same day.
alter table subtasks add column if not exists last_offered date;

-- True while a step sits on a day because the morning sweep put it there, as
-- opposed to the user dating it deliberately. Only auto-placed steps are
-- deferrable, and only they get reclaimed when a day passes unfinished.
alter table subtasks add column if not exists auto_placed boolean not null default false;
