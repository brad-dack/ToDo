-- Multi-user auth migration
--
-- IMPORTANT: Before running this, sign up for an account through the app's
-- new login/signup screen. This migration backfills all existing data to
-- the first (oldest) account in auth.users, which will be that account.

-- ============ 1. Add user_id columns (default = owner at insert time) ============

alter table subtasks
  add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;

alter table capacity_overrides
  add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;

alter table weekly_reviews
  add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;

alter table user_settings
  add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;

-- ============ 2. Backfill existing rows to the first account ============

update subtasks set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update capacity_overrides set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update weekly_reviews set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update user_settings set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;

-- ============ 3. Enforce not-null ============

alter table subtasks alter column user_id set not null;
alter table capacity_overrides alter column user_id set not null;
alter table weekly_reviews alter column user_id set not null;
alter table user_settings alter column user_id set not null;

-- ============ 4. Fix primary keys ============

-- user_settings: was keyed by id = 'default_user'; now keyed by user_id
alter table user_settings drop constraint if exists user_settings_pkey;
alter table user_settings drop column if exists id;
alter table user_settings add primary key (user_id);

-- capacity_overrides: was keyed by date; now per-user
alter table capacity_overrides drop constraint if exists capacity_overrides_pkey;
alter table capacity_overrides add primary key (user_id, date);

-- weekly_reviews: was keyed by week_start; now per-user
alter table weekly_reviews drop constraint if exists weekly_reviews_pkey;
alter table weekly_reviews add primary key (user_id, week_start);

-- ============ 5. Replace permissive RLS policies with owner-scoped ones ============

drop policy if exists "public read/write" on subtasks;
drop policy if exists "public read/write" on capacity_overrides;
drop policy if exists "public read/write" on weekly_reviews;
drop policy if exists "public read/write" on user_settings;

alter table subtasks enable row level security;
alter table capacity_overrides enable row level security;
alter table weekly_reviews enable row level security;
alter table user_settings enable row level security;

create policy "owner access" on subtasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner access" on capacity_overrides
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner access" on weekly_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner access" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Note: if any of these tables have other pre-existing permissive policies
-- (check Supabase Dashboard -> Authentication -> Policies), drop those too.
