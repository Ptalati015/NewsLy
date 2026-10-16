# Testing plan

How NewsLy is tested without spending money, and the acceptance checks for
each build step. Owned by the QA thread; `AGENTS.md` holds the short rules,
this file holds the detail. As of October 16, 2026.

## The cost rule

Testing costs $0 by default. Only a deliberate, capped live run spends model
money (see "Live runs").

| What could cost money | Cost in testing | Why |
| --- | --- | --- |
| Model calls | $0 | Tests use the fake provider; no model key exists anywhere tests run; outbound network is blocked in tests |
| GitHub Actions | $0 | The repo is public, so standard runners are free |
| Supabase | $0 | Tests use an in-process Postgres (PGlite) or the local Supabase stack in CI, never the real project |
| Vercel previews | $0 | Hobby plan |
| News sites | $0 | Tests use fixtures we write; they never call Google News or an outlet |

Claude cloud sessions on this project cannot reach the model gateway,
Supabase, Vercel or news sites (network policy, checked October 16, 2026), and
cannot pull Docker images. So a session cannot spend model money even by
mistake, and anything that needs those services runs in GitHub Actions.

## Test layers

| Layer | Tool | Covers | Runs in | When |
| --- | --- | --- | --- | --- |
| Static | `tsc`, ESLint, Prettier (`npm run check`) | Types, lint, format | Sessions and CI | Every PR |
| Unit | Vitest | Pure logic: URL normalizing, dedupe, cache keys, schemas, dates, session expiry, allow-list | Sessions and CI | Every PR |
| Database | Vitest + PGlite, real migrations, a small `auth` stub | RLS, grants, constraints, seed data | Sessions and CI | Every PR |
| Pipeline | Vitest, fixture news, fake model, PGlite | The daily job end to end | Sessions and CI | Every PR, from step 2 |
| Screens | Playwright (Chromium), local Supabase stack | The six screens at 390 x 844 and 1280 x 800 | CI | PRs that touch `app/`, `components/`, `lib/` or `supabase/` |
| Evals | `npm run evals`, real model | Flag agreement on ~30 labeled articles | Manual GitHub workflow | Only when a prompt, the rubric or the model changes |
| Live smoke | 1 to 3 real calls | The key works, the model is allowed, the response parses | Manual GitHub workflow | When the key is first added, and after a provider or model change |

## How model calls stay at $0

**The fake provider** is the default everywhere except the production daily
job.

- Built on AI SDK 7's `MockLanguageModelV4` from `ai/test` (present in
  `ai@7.0.142`), so tests go through the same `generateText` +
  `Output.object` path as production.
- Deterministic and input-driven: for each task it returns a schema-valid
  answer built from the input (summary from the first sentences, flags from a
  small keyword table, every quote copied verbatim from the article, framing
  Neutral unless a keyword says otherwise).
- It does not depend on `prompt_version` or the model name. Editing a prompt
  never breaks a test and never forces a re-record.
- It counts its calls, so tests assert exactly how many model calls a step made.
- Scripted mode: a test that needs a specific answer (invalid JSON, a flag
  whose quote is not in the article, a 429, a timeout) passes a list of
  responses.
- Recorded mode (optional, `tests/fixtures/llm/`): real responses captured
  during a budgeted live run, keyed by `(task, input_hash)`, used only by tests
  that check parsing of real provider output. A missing recording fails the
  test with a message. It never falls through to a live call.

**Tripwires**, so a mistake fails loudly instead of spending:

- Test setup blocks outbound network (MSW with `onUnhandledRequest: "error"`,
  or a `fetch` stub). Any real HTTP request fails the test.
- The provider factory throws when `NODE_ENV=test` or `CI=true` and
  `LLM_PROVIDER` is not `fake`, unless the live-run flag is set.
- The PR workflow (`ci.yml`) has no model key in its env or secrets and never
  uses `pull_request_target`. Only `daily.yml` and `live.yml` reference a key.
- The other direction: the daily job refuses `LLM_PROVIDER=fake` when it would
  write to the production database, so fake flags can never be shown as real
  ones. Fake is allowed only with `--dry-run` or a local database URL.

**Cost-protection tests**, free, on every PR from step 3:

- Running analysis twice on the same fixtures: the second run makes 0 calls.
- A story syndicated to three outlets: 1 call, not 3.
- A `prompt_version` bump re-analyzes the 7-day active window only.
- A digest with no new analyses reuses yesterday's: 0 calls.
- A response that fails validation is retried once, then skipped: exactly 2
  calls, and both count toward the kill switch.
- `MAX_MODEL_CALLS_PER_RUN` and `MAX_RUN_COST_USD` each stop the run cleanly at
  the cap, log it in `job_runs`, and leave yesterday's data up.
- A model missing from the price table makes a live run refuse to start. Cost
  estimates fail closed, never as $0.
- Every call sets `maxOutputTokens`, so a call's worst-case cost is known
  before it is made.

## Live runs

The only tests that spend money.

**When:** once when the AI Gateway key first exists (a smoke run on one
article: the key works, Claude Haiku 5.5 is allowed on the account's tier, and
the answer parses), then evals when a prompt, the rubric or the model changes.
Nothing else.

**How:**

1. The PM thread OKs the run with a dollar cap (default $0.50).
2. It runs from a manual GitHub Actions workflow, `live.yml`
   (`workflow_dispatch`), with inputs `task` (`smoke` or `evals`) and
   `budget_usd` (default 0.50, max 2.00). The key is a GitHub Actions secret
   and never goes into a Claude session.
3. Before the first call the script prints the estimate (calls x tokens x
   price) and stops if it is over the budget. During the run it adds up real
   spend from each response's usage and stops at the cap.
4. Results go through the same cache, so re-running an eval on the same
   prompt and model costs $0. The eval cache lives in a gitignored file, not in
   the repo.
5. Calls, tokens and cost are reported back in the PM thread.

**Expected cost:** a smoke run is well under one cent. One eval pass over 30
articles on Haiku is about 2 cents (scaled from the cost table in
`docs/design.md`).

**Keys:** two AI Gateway keys, one for the daily job and one for live tests,
each with a Gateway budget (Vercel can cap spend per API key and rejects
requests once the budget is used; the request that crosses the line may still
finish). Suggested budgets: $0.50 a month for tests, $3 a month for the daily
job. Both keys live only in GitHub Actions secrets: not in Vercel, because the
web app never calls a model, and not in Claude's environment.

## Test data

- **Only synthetic articles in git.** `tests/fixtures/news/` holds short
  articles we write, each built to trigger or avoid specific flags, plus RSS
  files in the same shape as Google News results. The repo is public, so
  copying real articles or their HTML into it would republish copyrighted
  text, and `AGENTS.md` already rules out raw article HTML in git.
- **Evals** (`evals/`) store, for each of the ~30 real articles: URL, outlet,
  date, the labels, and the short quotes that justify each label. Full text is
  fetched at eval time into a gitignored cache.
- **Seed data** (`data/ca-2026-general.json`) passes a schema test, and QA
  checks it once by hand against the Secretary of State's certified list.
- Test accounts use `example.com` addresses.

## Database and sign-in in tests

- Tests never touch the real Supabase project.
- **PGlite** (`@electric-sql/pglite`) runs Postgres in-process: apply
  `supabase/migrations/*`, plus a stub of about ten lines that creates the
  `anon`, `authenticated` and `service_role` roles and `auth.uid()` /
  `auth.jwt()` reading `request.jwt.claims`. A test sets the claims and the
  role, then queries. Prototyped on October 16, 2026 with PGlite 0.5.10: RLS
  policies, grants and a "tables without RLS" check behave as on Postgres.
- **Playwright** uses the local Supabase stack (`supabase start`) in CI, where
  Docker works. A global setup creates the test user through the admin API of
  the local stack and saves its session cookies (Playwright `storageState`).
  Email and password sign-in is enabled only in the local
  `supabase/config.toml`; production has Google only.
- No test-only login route, header or flag in the app.
- Google sign-in itself cannot be automated (Google blocks scripted sign-ins
  and it needs a real account), so it is a manual check on the Vercel preview.

## Clock and time zone

- Date logic takes `now` from one clock module, so tests set the date instead
  of waiting. Tests run with `TZ=America/Los_Angeles`.
- Dates every date test covers: October 20, 2026 (countdown 14 days),
  November 1 (daylight saving ends), November 3 (election day, "Today"),
  November 4 (moves to Past), and midnight Pacific for "New today".

## Step 1 (skeleton): acceptance checks

From the build order in `docs/design.md` and the security basics in
`AGENTS.md`. Candidate cards, the candidate page, the daily job and analysis
are out of scope.

**CI**

- C1. `ci.yml` runs `npm run check`, `npm test` and `npm run e2e` on every PR,
  sets `LLM_PROVIDER=fake`, and holds no secrets.
- C2. Playwright traces and screenshots are uploaded as a CI artifact on
  failure.

**Seed data**

- D1. 50 states; only California enabled.
- D2. California has the November 3, 2026 general election.
- D3. 12 statewide races with their exact office names; Board of Equalization
  as Districts 1 to 4.
- D4. Candidates match the certified list: name, party, incumbent (QA, by hand).
- D5. The seed passes its schema test; ids and slugs are unique.

**Sign-in and sessions**

- A1. Signed out, every page but `/sign-in` redirects there, then back to the
  page asked for after sign-in.
- A2. An allowed email gets in; case and surrounding spaces are ignored.
- A3. An email not on the list gets a plain "not on the beta list" message and
  no session is left behind.
- A4. Empty or unset `ALLOWED_EMAILS` lets nobody in.
- A5. The list protects the data, not only the pages: a signed-in user whose
  email is not on it reads 0 rows (database test).
- A6. Removing an email locks that person out on their next request.
- A7. Used every day, a 29-day-old session stays signed in.
- A8. 30 days after sign-in the session ends, even if used daily.
- A9. 7 days without use ends it; 6 days and 23 hours does not.
- A10. Signing out, or expiry, revokes the session on the server, not only the
  cookie (on Supabase's free plan refresh tokens never expire on their own).
- A11. Session cookies are HttpOnly, SameSite=Lax, and Secure in production.
- A12. The sign-in callback only redirects to paths on this site.
- A13. Manual, by the owner: Google sign-in works on the Vercel preview, on a
  phone.

**Data access (database tests)**

- R1. Every table in `public` has RLS enabled; a new table without it fails
  the test.
- R2. `anon` reads nothing.
- R3. An allowed reader can select states, elections, races and candidates,
  and cannot insert, update or delete.
- R4. A reader sees and changes only their own `users` row, and only
  `home_state`.
- R5. The service role can write.

**Secrets**

- S1. CI builds with sentinel values (`SUPABASE_SERVICE_ROLE_KEY=sentinel-srk`,
  `AI_GATEWAY_API_KEY=sentinel-gw`) and a test asserts neither string appears
  in `.next/static` or in any page's HTML.
- S2. Modules that read server keys import `server-only`.
- S3. No key variable is prefixed `NEXT_PUBLIC_` (a test greps the source).

**Screens (Playwright, 390 x 844 and 1280 x 800)**

- U1. Pick a state: 50 states, California tappable, the rest "Coming soon"
  and not tappable.
- U2. The choice is remembered: the next visit goes straight to California's
  elections.
- U3. Elections: the November 3 general under Upcoming with its date and
  countdown (clock fixed at October 20, 2026: 14 days); Past shows an empty
  state when there are none.
- U4. Races: grouped by level, Statewide first, 12 rows each with office and
  candidate count.
- U5. Deep links open directly; an unknown state, election or race shows the
  404 page; a disabled state's URL shows "Coming soon", not an error.
- U6. Browser back returns to the previous screen.
- U7. Every link and button is at least 44 x 44 px (measured by the test).
- U8. No sideways scrolling at 390 px.
- U9. No serious or critical accessibility violations (`@axe-core/playwright`).
- U10. Pages make no request to any host but the app and local Supabase.
- U11. Looks like the approved mockup: Newsreader headlines, Public Sans body,
  deep blue accent, white cards on light grey (QA compares screenshots).

## Later steps, in outline

**Step 2, daily run:** the pipeline test on fixtures; a URL-normalizing table
(tracking params, AMP, trailing slashes); dedupe of exact repeats, title plus
outlet repeats and syndicated copies; paywalled stories marked; `robots.txt`
respected; one search per candidate per run; `job_runs` written on success and
on failure; a failed run leaves yesterday's data up; `--dry-run` writes
nothing; the 5 AM Pacific schedule still holds after daylight saving ends
(GitHub cron runs on UTC).

**Step 3, analysis:** the cost-protection tests above; the output schema; every
flag's quote appears verbatim in the article text (a plain string check after
the model answers); framing is one of the three labels; digest bullets link
only to analyses in the window; "New today"; the candidate screens to the same
standard as U1 to U11. Then, with the PM's OK, the first live smoke run and the
first eval run.

## Manual checks for the owner

- A PR that touches sign-in: open the preview link on your phone and sign in
  with Google.
- A PR that changes screens: open the preview on your phone and tap through.

## Bugs

A bug found in a PR is a review comment on that PR, written as in
`.claude/agents/qa.md`: steps, expected, actual, environment, evidence. Anything
else goes to the PM thread. QA re-checks every fix.
