# One-time setup: Multi-user auth

The app now requires a Supabase account to use. Existing data (tasks,
settings, etc.) is currently shared/global and needs to be migrated to your
account.

## 1. Deploy the updated `index.html`

Publish the new `index.html`, which now shows a login/signup screen.

## 2. Sign up for your account

Open the app and use the "Need an account? Sign up" link to create your
account with email + password.

- If email confirmations are enabled on your Supabase project (Authentication
  → Providers → Email), check your inbox and confirm before logging in.
- If you'd rather skip email confirmation for now, disable "Confirm email" in
  the Supabase Dashboard under Authentication → Providers → Email.

## 3. Run the migration SQL

In the Supabase Dashboard → SQL Editor, run the contents of
`supabase/migrations/20260614000000_multi_user_auth.sql`.

This adds a `user_id` column to `subtasks`, `capacity_overrides`,
`weekly_reviews`, and `user_settings`, backfills all existing rows to your
new account (the first/only row in `auth.users` at this point), and replaces
the old "public read/write" policies with policies scoped to
`auth.uid() = user_id`.

## 4. Verify

- Reload the app — you should be logged in and see your existing tasks and
  settings.
- Log out (Settings → Log Out) — you should land back on the login screen.
- Optionally, sign up a second test account in an incognito window and
  confirm it starts empty and can't see the first account's data.
