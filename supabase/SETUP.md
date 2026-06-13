# One-time setup: AI Edge Functions

This adds two Supabase Edge Functions (`ai-capture`, `ai-weekly-review`) that call
the Anthropic API on the server side, keeping your Anthropic API key out of the
browser.

## 1. Install the Supabase CLI

Windows (PowerShell), pick one:
```powershell
scoop install supabase
# or
npm install -g supabase
```

## 2. Log in and link this project

From `C:\Users\bjdac\ToDo`:
```powershell
supabase login
supabase init
supabase link --project-ref wuhklqulwhioiynoadtj
```
(`wuhklqulwhioiynoadtj` is the ref from your Supabase URL `https://wuhklqulwhioiynoadtj.supabase.co`.)

## 3. Set your Anthropic API key as a secret

```powershell
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

Get a key from https://console.anthropic.com/settings/keys if you don't have one.

## 4. Create the `weekly_reviews` table

In the Supabase Dashboard → SQL Editor, run:

```sql
create table weekly_reviews (
  week_start date primary key,
  summary text not null,
  created_at timestamptz default now()
);
alter table weekly_reviews enable row level security;
create policy "public read/write" on weekly_reviews for all using (true) with check (true);
```

This matches the permissive RLS pattern already used by `subtasks` and `user_settings`.

## 5. Deploy the functions

```powershell
supabase functions deploy ai-capture
supabase functions deploy ai-weekly-review
```

## 6. Test

```powershell
supabase functions invoke ai-capture --body '{\"text\":\"service the car next month, not urgent\",\"today\":\"2026-06-13\"}'
```

Should return something like:
```json
{"title":"Service the car","deadline":"2026-07-13","importance":3,"recurrence":null}
```

Once deployed, the app's "✨ Auto-fill with AI" button (Add Project screen) and the
"📊 Your Week" card (Home screen) will work automatically — no client-side config
needed beyond what's already in `index.html`.
