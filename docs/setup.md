# Setting up the accounts

The owner creates every account and key; nobody else needs to see them. This
page says what to create, in what order, and where each value goes. Nothing
here costs money: Supabase, Google Cloud and Vercel are all used on free
plans, and no model key is needed until build step 3.

Until these exist, the app still runs locally in demo mode
(`npm run dev:demo`), with sample candidates and no sign-in.

## What you will end up with

| Value | Where it comes from | Where it goes |
| --- | --- | --- |
| Supabase project URL | Supabase, Project Settings > API Keys | Vercel env `NEXT_PUBLIC_SUPABASE_URL` |
| Supabase publishable key (`sb_publishable_...`) | Same page | Vercel env `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Google OAuth client ID and secret | Google Cloud console | Supabase, Authentication > Sign In / Providers > Google (not Vercel) |
| Your Gmail address | You | Vercel env `ALLOWED_EMAILS`, and one row in the Supabase table `allowed_emails` |

The Supabase secret key (`sb_secret_...`) is not needed yet. It goes into
GitHub Actions secrets for the daily news run in build step 2, never into
Vercel.

## 1. Supabase (database and sign-in)

1. At supabase.com, create a project on the Free plan. Region: West US
   (North California). Save the database password somewhere safe; the app
   doesn't use it.
2. Open SQL Editor, paste the contents of
   `supabase/migrations/20261016120000_skeleton.sql`, and run it once. Then
   paste and run `supabase/seed.sql` (safe to run again).
3. Still in SQL Editor, add yourself to the beta list:
   `insert into public.allowed_emails (email) values ('you@gmail.com');`
   The database only shows its data to emails in this table, so the list
   holds even for someone who calls Supabase directly. Add each friend the
   same way, and to `ALLOWED_EMAILS` in section 3.
4. Open Authentication > Sign In / Providers and turn off Email (and Phone,
   if it's on), so Google is the only way to sign in.
5. Open Project Settings > API Keys and keep the tab open: you need the
   project URL and the publishable key in section 3.

A free project pauses after 7 days without activity. Until the daily news
run exists (build step 2), open the app at least once a week, or press
Restore in the Supabase dashboard if it pauses.

## 2. Google sign-in

1. At console.cloud.google.com, create a project named NewsLy.
2. Under Google Auth Platform, set up the consent screen: app name NewsLy,
   your email as support contact, audience External. Leave it in Testing and
   add your Gmail as a test user. (Testing mode is fine for a private beta.)
3. Under Clients, create an OAuth client of type Web application. Add one
   Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   (the project ref is the first part of your Supabase project URL).
4. Copy the client ID and client secret into Supabase: Authentication >
   Sign In / Providers > Google. Turn it on and save.

## 3. Vercel (the website)

1. At vercel.com, on the Hobby plan, add a new project and import the
   `Ptalati015/NewsLy` repository.
2. Before the first deploy, add these environment variables (all
   environments):
   - `NEXT_PUBLIC_SUPABASE_URL`: the Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the publishable key
   - `ALLOWED_EMAILS`: your Gmail address (comma-separate more later)
   - Optional: `SESSION_MAX_AGE_DAYS` (default 30) and `SESSION_IDLE_DAYS`
     (default 7)
3. Deploy and note the production address, for example
   `https://newsly-abc.vercel.app`. Every pull request also gets its own
   preview address, but sign-in only works on the production address (see
   section 4).

## 4. Tell Supabase where the website lives

In Supabase, Authentication > URL Configuration:

- Site URL: the production address from section 3.
- Redirect URLs, one per line, and nothing else:
  - `https://<production address>/**`
  - `http://localhost:3000/**` (local development)

Don't add a wildcard for pull request previews, such as
`https://*-<team>.vercel.app/**`. Anyone can create a Vercel project whose
address matches it, and a sign-in link could then hand your session to their
site. The `/**` above is safe because it stays on your own address. On a
preview, Continue with Google ends up on the production address without
signing you in, so do sign-in checks on production.

## 5. Try it

Open the production address on your phone. You should see the sign-in
screen; Continue with Google should bring you back to the state picker.
Choose California and the app remembers it next time.

If the sign-in screen says "Sign-in isn't set up yet", the two
`NEXT_PUBLIC_SUPABASE_*` variables are missing in Vercel. If Google says the
redirect URI doesn't match, recheck the URI in section 2, step 3. If you land
back on sign-in with "isn't on the beta list", check that the email is both in
`ALLOWED_EMAILS` (then redeploy) and in the `allowed_emails` table (section 1,
step 3).
