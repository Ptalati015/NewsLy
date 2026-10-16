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

The repository is empty of code until the first build step lands. Until a
`package.json` exists, commands below are the intended ones, not working ones.

## Commands (intended)

```
npm install            # once; the cloud session hook runs this for you
npm run dev            # web app on http://localhost:3000
npm run check          # tsc + eslint + prettier --check
npm test               # vitest
npm run e2e            # playwright against a local dev server
npm run job:daily      # the daily news run, reads .env
npm run job:daily -- --date 2026-10-20 --dry-run   # no writes, no model calls
```

## Layout (planned)

```
app/                 Next.js routes: /(auth)/sign-in, /[state], /[state]/[election], ...
components/          UI pieces, one folder per screen plus shared/
lib/                 db client, auth helpers, brand, formatting
lib/llm/             provider factory, prompts, schemas, cache (see below)
jobs/daily/          find articles -> dedupe -> fetch text -> analyze -> digest
supabase/            migrations and seed (states, elections, races, candidates)
data/                seed files: ca-2026-general candidates, outlet feeds, AllSides lean
evals/               ~30 hand-labeled articles to compare models and prompts
docs/                design.md and any decision notes
.github/workflows/   ci.yml (check + test on PRs), daily.yml (the job)
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
   Vercel project settings and GitHub Actions secrets. `SUPABASE_SERVICE_ROLE_KEY`
   and model keys are server-only: never import them in a client component and
   never prefix them with `NEXT_PUBLIC_`.
5. **Structured output, validated.** Model responses are requested as JSON
   against a Zod schema (`generateObject`) and validated before they are stored.
   A response that fails validation is retried once, then logged and skipped.
6. **Attribute every claim.** Summaries say who said what ("the campaign said",
   "the Times reported") and link every bullet to its source articles. No
   adjectives about candidates, no predictions.
7. **Phone first.** Every screen is designed at 390 px wide and must work there
   with 44 px touch targets; it widens to a centered column on a laptop.
8. **Small PRs, one build step each**, in the order in `docs/design.md`. A PR
   that changes behavior updates the design doc in the same PR.

## Model layer

- One factory, `lib/llm/provider.ts`, returns an AI SDK model from
  `LLM_PROVIDER` + `LLM_MODEL`. Supported out of the box: `google`, `openai`,
  `anthropic`, `groq`, `gateway` (Vercel AI Gateway). Adding a provider is one
  case in that factory plus its npm package.
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

## Security basics (Next.js + Supabase)

- Supabase RLS is on for every table. Readers get `select` on news tables;
  only the service role writes.
- Sign-in is restricted to `ALLOWED_EMAILS` during the beta, checked server-side
  after the OAuth callback.
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
- Change the bias rubric, the flag names or the framing labels silently.
- Skip, disable or quarantine a test to get CI green.
- Reuse the daily-job service role key in the web app.
