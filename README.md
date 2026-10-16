# NewsLy (working name)

Election news about the candidates you care about, in one place, summarized
every morning, with the bias in each article flagged and quoted.

Beta scope: California, the November 3, 2026 general election, the 12 statewide
races. Built for one reader first, with sign-in so more can be invited later.

## Status

Build step 1 (skeleton) in review: sign-in, the state, election, race and
candidate screens, the database tables and CI. The design, the bias rubric, the data flow
and the build order are in [`docs/design.md`](docs/design.md). Working rules for
contributors and AI coding agents are in [`AGENTS.md`](AGENTS.md).

## How it works

```
5 AM Pacific, GitHub Actions
  find new articles per candidate (Google News search, outlet feeds)
  -> drop repeats and off-topic stories
  -> read each article (or headline + preview if paywalled)
  -> model: per-article summary, framing, bias flags with quotes   (cached, once per article)
  -> model: per-candidate daily summary                            (cached, once per change)
  -> Supabase Postgres

Any time, your phone
  Next.js on Vercel reads the database: State -> Election -> Race -> Candidates -> Candidate page
```

The website never calls a model or a news site. If a morning run fails,
yesterday's summaries stay up.

## Stack

Next.js + TypeScript + Tailwind on Vercel · Supabase (Postgres, Google sign-in)
· a Node job on GitHub Actions · Vercel AI SDK with the model provider chosen by
config. Free plans everywhere except the model provider, which costs a few
dollars a month at this volume.

## Running it

Without any account, on sample data:

```
npm install
npm run dev:demo               # http://localhost:3000, no sign-in
```

With the real accounts (see [`docs/setup.md`](docs/setup.md) for creating them):

```
cp .env.example .env.local     # Supabase values; the fake model provider is the default
npm run dev                    # http://localhost:3000
```

Tests: `npm run check`, `npm test`, then `npm run build && npm run e2e`.

## Layout

```
app/          Next.js routes          jobs/daily/   the news run
components/   UI, one folder a screen supabase/     migrations and seed
lib/llm/      prompts, schemas, cache data/         candidates, feeds, outlet lean
tests/        fixtures and unit tests evals/        article URLs, labels, quotes
docs/         design.md, testing.md
```

## Credits

Outlet lean labels use AllSides Media Bias Ratings (allsides.com), CC BY-NC 4.0.
Candidate lists come from the California Secretary of State. Bias flags are
AI-detected and always show their evidence; they can be wrong.
