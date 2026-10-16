# AGENTS.md

Working rules for AI coding agents (and people) in this repository. Read this
before changing anything. `docs/design.md` is the approved design; this file is
the how.

## What this is

A phone-friendly website that collects news about election candidates,
summarizes it once a day per candidate, and flags bias in every article it
drew from, quoting the words that triggered each flag. Beta scope: California,
the November 3, 2026 general election, the 12 statewide races. Working name:
NewsLy (a rename is pending; keep the name in one place, `lib/brand.ts`, once
code exists).

Flow: sign in with Google, pick a state, pick an election, pick a race, see the
candidates, open a candidate page (daily summary, coverage balance, articles
with bias flags).

## Stack

| Part | Choice |
| --- | --- |
| Web app | Next.js (App Router), TypeScript strict, Tailwind CSS, deployed on Vercel |
| Data and sign-in | Supabase: Postgres, Auth (Google provider), Row Level Security on |
| Daily job | Node/TypeScript script in `jobs/`, run by GitHub Actions at 5 AM Pacific |
| Models | Vercel AI SDK (`ai` package) with a provider chosen by env, see "Model layer" |
| Tests | Vitest for units, Playwright for the six screens |
| Lint and format | ESLint (next config) and Prettier; `npm run check` runs both plus `tsc` |

## Commands

```
npm install            # once; the cloud session hook runs this for you
npm run dev            # web app on http://localhost:3000, needs .env.local
npm run dev:demo       # same, on the seed files with sample candidates, no sign-in
npm run check          # next typegen + tsc + eslint + prettier --check
npm test               # vitest: units, seed files, database access rules (PGlite)
npm run build          # production build; works with no keys at all
npm run e2e            # playwright: demo screens + sign-in gate (run build first)
npm run seed:sql       # regenerate supabase/seed.sql after editing data/
```

Not built yet (build step 2):

```
npm run job:daily      # the daily news run, reads .env
npm run job:daily -- --date 2026-10-20 --dry-run   # no writes, no model calls
```

In a cloud session, point Playwright at the preinstalled browser with
`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`.

## Layout (planned)

```
app/                 Next.js routes: /(auth)/sign-in, /[state], /[state]/[election], ...
components/          UI pieces, one folder per screen plus shared/
lib/                 db client, auth helpers, brand, formatting
lib/llm/             provider factory, prompts, schemas, cache (see below)
jobs/daily/          find articles -> dedupe -> fetch text -> analyze -> digest
supabase/            migrations and seed (states, elections, races, candidates)
data/                seed files: ca-2026-general candidates, outlet feeds, AllSides lean
tests/               unit and database tests; fixtures/ holds synthetic articles and optional recorded model answers
evals/               ~30 real articles as URL + labels + quotes (no article text); full text is fetched at eval time
docs/                design.md, testing.md (QA's plan) and any decision notes
.github/workflows/   ci.yml (check + test on PRs, no secrets), daily.yml (the job), live.yml (manual, capped live runs)
```

## Rules that matter most

1. **The web app never calls a model or a news site.** Pages read rows that the
   daily job wrote. A slow or failed run means yesterday's data stays up.
2. **Ask the model once per input.** Every model call goes through
   `lib/llm/cached.ts`, keyed by `sha256(task, prompt_version, model,
   input_hash)`. On a hit, no call is made. See "Caching" below.
3. **Bias flags judge the writing, never the candidate.** The rubric in
   `docs/design.md` ("How summaries and bias flags work") is the contract.
   Every flag must carry a verbatim quote from the article. Never change the
   rubric without updating the design doc and bumping `prompt_version`.
4. **Secrets stay out of git.** Real values live in `.env.local` (ignored),
   Vercel project settings (Supabase URL and publishable key only) and GitHub
   Actions secrets (`SUPABASE_SECRET_KEY` and the model keys). Model keys never
   go to Vercel or into a Claude session: only the daily job and the manual
   live-test workflow call a model. Server keys are never imported in a client
   component and never prefixed with `NEXT_PUBLIC_` (a unit test checks the
   names, and CI checks the build output for stand-in keys).
5. **Structured output, validated.** Model responses are requested as JSON
   against a Zod schema (AI SDK 7: `generateText` with `Output.object`; the older
   `generateObject` is deprecated) and validated before they are stored. A
   response that fails validation is retried once, then logged and skipped.
6. **Attribute every claim.** Summaries say who said what ("the campaign said",
   "the Times reported") and link every bullet to its source articles. No
   adjectives about candidates, no predictions.
7. **Phone first.** Every screen is designed at 390 px wide and must work there
   with 44 px touch targets; it widens to a centered column on a laptop.
8. **Small PRs, one build step each**, in the order in `docs/design.md`. A PR
   that changes behavior updates the design doc in the same PR.

## Model layer

- One factory, `lib/llm/provider.ts`, returns an AI SDK model from
  `LLM_PROVIDER` + `LLM_MODEL`. Supported out of the box: `gateway` (Vercel AI
  Gateway, the recommended default: one key, any model as `provider/model`),
  `google`, `openai`, `anthropic`, `groq`, `mistral`. Adding a provider is one
  case in that factory plus its npm package. Pin `ai` to the 7.x line.
- Default model: `anthropic/claude-haiku-5-5` through the gateway (about $2 a
  month at beta volume, inside the gateway's free credit). Cost table and the
  reasoning are in `docs/design.md`, "Model layer and cost".
- Before anyone buys gateway credits, the first live smoke run (see "Testing
  and cost guardrails") confirms that `anthropic/claude-haiku-5-5` is allowed
  on the free tier. The free credit has been reported to cover only some models
  (a 403 `RestrictedModelsError` otherwise), and a first purchase ends the free
  monthly credit.
- Prompts live in `lib/llm/prompts/*.ts` as plain template functions. The fixed
  part (rubric, output schema, style rules) comes first so providers that cache
  prefixes get the discount; the article comes last.
- `prompt_version` is a hash of the prompt template text plus the output schema,
  computed at build time, stored on every analysis row.
- Every call logs provider, model, input/output tokens, cached-token count,
  latency and an estimated cost into `llm_calls`. Cost per day is visible in
  `job_runs`.
- Switching models is an env change. Before making a switch the default, run
  `npm run evals` against `evals/` and compare flag agreement with the labels.

## Caching

The goal the owner set: analyze an article the first time it appears and never
again, unless something about how we analyze it changes.

- **Article analysis** is keyed by `(article_id, candidate_id, prompt_version,
  model)`. Reruns of the job for the same day make zero model calls.
- **Candidate digest** is keyed by `(candidate_id, date, input_hash)` where
  `input_hash` is the sorted list of analysis ids in the 7-day window. If no new
  analysis arrived, yesterday's digest is reused and marked "no new coverage".
- **Dedupe before analysis.** Normalize URLs (strip tracking params, AMP, trailing
  slashes), drop exact title+outlet repeats, and detect syndicated wire copies by
  a body-text shingle hash. The canonical copy is analyzed once; the others are
  attached as "also published in".
- **A prompt_version bump re-runs only the active window** (the last 7 days of
  live races), never the archive. Older rows keep their version, which the UI
  shows in the article detail footer.
- **Provider prefix caching** is on where the provider supports it (Anthropic
  `cache_control`, OpenAI automatic, Gemini implicit). It is a discount, not a
  correctness mechanism; the database cache above is what guarantees "once".
- **Pages are static-first.** Candidate pages use ISR with on-demand
  revalidation triggered at the end of the daily run.

## Data

- Source of truth for candidates: the California Secretary of State's certified
  list, copied into `data/ca-2026-general.json` by hand and reviewed. No live
  candidate API.
- News discovery: Google News search RSS per candidate (name plus office), with
  outlet RSS feeds in `data/outlets.json` as a backup. Be polite: one search per
  candidate per run, a shared `User-Agent` naming the project, and respect
  `robots.txt` when fetching article text.
- Paywalled articles are analyzed from headline and preview only and marked
  `paywalled = true`; the UI says so.
- Outlet lean labels come from AllSides ratings (CC BY-NC 4.0; attribution
  required, non-commercial only). Keep the attribution line wherever a lean label
  shows, and keep the project non-commercial while that data is in use.

## Team: Dev, QA, PM

Three roles, each with a project thread and a matching agent definition in
`.claude/agents/`. The owner talks to PM; PM routes work.

| Role | Owns | Hands off |
| --- | --- | --- |
| Dev (`.claude/agents/dev.md`) | Implementation, one PR per build step, driving PRs to green | A PR ready for test goes to QA via PM, with what changed and how to run it |
| QA (`.claude/agents/qa.md`) | The test plan (`docs/testing.md`), Playwright and unit test review, bug reports, verifying fixes | Failures go back to Dev via PM with repro steps |
| PM (`.claude/agents/pm.md`) | Backlog and status board, decisions, when to ask the owner for keys, budget watch, alarms | Review and merge requests go to the owner |

Standing rules from the owner:

- **Alarms go to the owner immediately**: a security problem, an unexpected
  cost, a slipping date, anything that looks wrong. One line, with a
  recommendation.
- **Keys and accounts are the owner's to create** (Vercel and its AI Gateway,
  Supabase, Google OAuth). We say when we are ready for them and what to paste
  where; we never ask for a value in chat and never commit one.
- **Ask questions as needed**, with options on short lines and a recommendation.

## Testing and cost guardrails

Model calls cost money; tests must not spend it. The short rules are here; the
full plan, with the acceptance checks for each build step, is QA's
`docs/testing.md`.

- `LLM_PROVIDER=fake` is the default everywhere except the production daily
  job. The fake provider answers every call with a deterministic, schema-valid
  response built from the input (summary from the first sentences, flags from a
  small keyword table, quotes copied verbatim), so unit, integration and
  Playwright tests never reach a model, and a prompt edit never breaks a test
  or forces a re-record: the fake ignores `prompt_version` and the model name.
  Recorded real answers are optional, live in `tests/fixtures/llm/` keyed by
  `(task, input_hash)`, and a missing recording fails the test; it never falls
  through to a live call. CI sets `LLM_PROVIDER=fake` explicitly and holds no
  model key.
- The fake never reaches production. The daily job refuses `LLM_PROVIDER=fake`
  unless it runs with `--dry-run` or against a local database URL, so fake
  flags can never be stored as real ones. The other way round, the provider
  factory throws under `NODE_ENV=test` or `CI=true` when the provider is not
  `fake`, unless the live-run flag is set.
- Any run that makes real model calls (a smoke test, an eval) is opt-in:
  `--live` plus `--budget-usd` (default 0.50), started from the manual
  `live.yml` workflow with PM's OK. The script estimates the cost from token
  counts first and stops at the cap; retries count toward it.
- The daily job has two kill switches: `MAX_MODEL_CALLS_PER_RUN` (default 200)
  and `MAX_RUN_COST_USD` (default 0.25, about four normal days). Hitting either
  ends the run cleanly, logs it in `job_runs`, and keeps yesterday's data up.
  Every call sets `maxOutputTokens`, so its worst-case cost is known before it
  is made. A model missing from the price table fails closed: the run refuses
  to start rather than estimating $0.
- Every call's tokens and estimated cost land in `llm_calls`; `job_runs` carries
  the day's total. A day costing more than twice the 7-day average is an alarm
  (see Team).
- Two Vercel AI Gateway keys, each with its own per-key budget set in the
  gateway: one for the daily job, one for live tests. Both live only in GitHub
  Actions secrets, referenced only by `daily.yml` and `live.yml`. The gateway
  credit is prepaid, so the hard ceiling is what the owner has loaded; keep the
  free monthly credit as the budget until the owner says otherwise.
- Only synthetic articles go in git (`tests/fixtures/news/`, written by us to
  trigger or avoid specific flags). The repo is public, so real article text
  would republish copyrighted work. Evals store URL, outlet, date, labels and
  the short quotes behind each label; full text is fetched at eval time into a
  gitignored cache.
- Playwright runs against demo mode (the seed files, sample candidates) and a
  production build with placeholder Supabase settings, never against live
  news, a model or a real account. Once analyses exist it uses precomputed
  fixtures for them.

## Security basics (Next.js + Supabase)

- Supabase RLS is on for every table. Readers get `select` on news tables;
  only the service role writes.
- Sign-in is restricted to an allow-list during the beta, and the list guards
  the data, not only the pages. Supabase Auth's own endpoints accept a sign-up
  from anyone holding the public key, so a policy written `to authenticated`
  is not enough: every reader policy also calls `public.is_allowed()`, a SQL
  function that checks the signed-in email against the `allowed_emails` table
  on each request, so removing someone takes effect at once. The app checks
  `ALLOWED_EMAILS` on every request and in the sign-in callback, together with
  `is_allowed()`, to show a plain "not on the beta list" message. The owner
  adds each email in both places (`docs/setup.md`); the email/password
  provider stays off (Google only). New reader tables use the same check.
- Sessions use HttpOnly cookies (`@supabase/ssr`, PKCE) with refresh-token
  rotation, so you stay signed in. Supabase's own session limits are a paid
  feature, so the app enforces expiry itself in `proxy.ts` (Next.js 16's name
  for middleware): `SESSION_MAX_AGE_DAYS` (default 30) since sign-in, read
  from the signed `amr` claim in the access token, and `SESSION_IDLE_DAYS`
  (default 7) since last activity, tracked by the `nl_last_seen` cookie; past
  either, the session is revoked at Supabase and the reader returns to the
  sign-in screen. Pages check the same rules again (`lib/auth/viewer.ts`).
- Form posts go to route handlers that refuse a missing or foreign `Origin`.
- Demo mode (`NEWSLY_DEMO=1`) skips sign-in, so it only works under
  `next dev`; production builds ignore it.
- Server Actions and route handlers validate input with Zod and never trust
  route params for authorization.
- Article HTML fetched by the job is parsed with a sanitizing extractor; raw
  HTML is never stored or rendered.

## Pull requests

- Title: imperative, under 70 characters. Body: a "Before" and "After" paragraph,
  then how.
- CI must pass `npm run check` and `npm test`.
- Do not merge your own PR; the owner reviews.

## Never

- Call a model or external site from a request handler or React component.
- Store raw article HTML, or any key, in the database or git.
- Commit real article text: fixtures are synthetic, evals hold URLs, labels and
  short quotes. The repo is public.
- Run the daily job with `LLM_PROVIDER=fake` against the production database.
- Put a model key in Vercel or in a Claude session.
- Change the bias rubric, the flag names or the framing labels silently.
- Skip, disable or quarantine a test to get CI green.
- Reuse the daily-job service role key in the web app.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
