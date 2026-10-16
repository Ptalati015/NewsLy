# NewsLy MVP design

As of October 16, 2026. Owner: Talati. Status: approved for build, with the
model provider and the product name to be confirmed (see "Decisions").

## What the MVP is

A phone-friendly website where you sign in, pick California, choose an
election, and read a daily summary of the news about each candidate, with bias
flags on every article it drew from.

It is for one reader first, behind a login, but built so other people can be
invited later without a rebuild.

**In the beta**

- California only, starting with the November 3, 2026 general election.
- The 12 statewide races: Governor, Lieutenant Governor, Attorney General,
  Secretary of State, Treasurer, Controller, Insurance Commissioner,
  Superintendent of Public Instruction, and the four Board of Equalization
  districts. About 24 candidates.
- One summary per candidate, refreshed every morning, linking every source.
- Bias flags on each article, showing the exact words that triggered each flag.
- Outlet lean labels (left, center, right) from AllSides ratings.
- Google sign-in; the app remembers your state.

**Not in the beta**

- Other states (shown as "Coming soon").
- US House, state legislature and local races (next after statewide).
- Ballot measures, email or push alerts, sharing and comments.
- Paywalled article text: summarized from headline and preview only.

After November 3 the election stays browsable as a past election.

## User flow and screens

Six screens, each one tap deeper than the last. A Race step sits between
Election and Candidates because a general election has many races.

1. **Sign in.** Google only. Only on the first visit; after that you stay in.
2. **Pick a state.** All 50 listed; California active, the rest "Coming soon".
   Remembered, so the screen is skipped next time.
3. **Elections in California.** Upcoming first, with date and countdown; past
   elections below.
4. **Races in this election.** Grouped by level, Statewide first. Each row shows
   the office and candidate count.
5. **Candidates in this race.** A card per candidate: name, party, incumbent
   tag, latest headline, coverage-balance bar.
6. **Candidate page.** Daily summary on top, then coverage balance, then the
   article list. Each article expands to its bias flags with quotes and a link
   to the original.

Clickable mockup (sample data): https://claude.ai/artifact/QzTUvrnnHVgtjsTZsgT558

Look: calm and simple. Deep blue accent, serif headlines (Newsreader), sans body
(Public Sans), white cards on a light grey ground. The owner approved this theme.

## How summaries and bias flags work

Every article gets a short neutral summary and a check against five flags, and
every flag quotes the exact sentence that triggered it.

**The candidate summary** covers the last 7 days in 3 to 5 bullets, refreshed
every morning, with anything from the last 24 hours marked "New today". Each
bullet links to its source articles and says who claimed what. Fixed neutral
style: no adjectives about the candidate, no predictions.

**Article flags**

| Flag | What triggers it |
| --- | --- |
| Loaded language | Charged or judgmental words in news writing ("slammed", "radical", "disastrous") |
| One-sided sourcing | Only one side quoted or cited, with no chance to respond |
| Unsupported claim | A factual claim with no source, data or attribution |
| Headline mismatch | The headline claims more, or something different, than the body supports |
| Opinion piece | An editorial, column or analysis. A label, not a fault |

Each article also gets a framing tag toward the candidate: Favorable, Neutral
or Critical. The coverage-balance bar counts those over the last 7 days.

**Outlet lean.** Each outlet shows its AllSides rating (Left, Lean Left, Center,
Lean Right, Right) when AllSides has one, with the required attribution. This
is about the outlet, not the article; the flags above are about the article.

**Guardrails**

- Flags are labeled "AI-detected" and always show the quoted evidence.
- The check judges the writing, never the candidate's positions.
- A critical article with fair sourcing gets no flags.

## Where the data comes from

Candidates are seeded by hand from the Secretary of State's certified list;
news is found once a day by searching for each candidate; the website only
reads what the morning run saved.

- **Candidates.** The California Secretary of State certified the November 3
  list on August 27, 2026. The 12 statewide races are copied into
  `data/ca-2026-general.json`. No free API lists California candidates
  reliably (Google retired its Representatives API in April 2025).
- **News.** Google News search RSS, one search per candidate by name and
  office. Free, widely used, undocumented; blocks heavy polling. One search per
  candidate per day is light.
- **Backup feeds.** RSS from about 15 California and national outlets, filtered
  by candidate name. GDELT stays out of the beta (it has been refusing most
  requests).
- **Article text.** Read from the outlet page when free; paywalled stories use
  headline and preview.
- **Schedule.** 5 AM Pacific on GitHub Actions. Vercel's free plan caps a
  function at 300 seconds, too short for a hundred articles; Actions allows
  hours.

## Model layer and cost

The owner has no API key with any provider and wants the cheapest workable
option without being tied to one vendor. So:

- **One interface, any provider.** The Vercel AI SDK talks to Google, OpenAI,
  Anthropic, Groq, Mistral and Vercel's AI Gateway behind one call. The
  provider and model are env settings. Switching is a config change.
- **Structured JSON output** validated against a schema, so every provider
  returns the same shape.
- **An eval set** of about 30 hand-labeled articles in `evals/` to compare
  providers on flag agreement before switching the default.
- **Volume** at the beta scope: about 100 articles a day, ~3,500 input and
  ~400 output tokens each, plus ~25 short digests. Roughly 11M input and 1.5M
  output tokens a month.

Cost comparison and the recommended default: see "Decisions" below (filled in
from a provider check on October 16, 2026).

## Caching: ask the model once

The owner's rule: analyze a new article the first time, never again, unless a
new parameter is introduced.

1. **Every model call is a cache lookup first.** Key:
   `sha256(task, prompt_version, model, input_hash)`. Hit: reuse, no call.
   Reruns and crashes cost nothing.
2. **Article analysis** is stored per `(article, candidate, prompt_version,
   model)`. A debate recap that names two candidates gets two analyses, one per
   candidate, because framing is relative to the candidate.
3. **Candidate digest** is stored per `(candidate, date, input_hash)` where the
   input is the sorted list of analysis ids in the 7-day window. Nothing new
   since yesterday: reuse yesterday's digest, marked "no new coverage".
4. **Dedupe first.** Normalize URLs (tracking params, AMP, trailing slashes),
   drop exact title+outlet repeats, detect syndicated wire copies by a
   body-text shingle hash. One analysis per story; the other outlets attach as
   "also published in".
5. **"New parameter" means a new `prompt_version`**: a hash of the prompt text
   and output schema. Adding a flag type or changing a rule bumps it. A bump
   re-runs only the active window (last 7 days of live races), never the
   archive. Old rows keep their version, shown in the article footer.
6. **Provider prefix caching** (Anthropic `cache_control`, OpenAI automatic,
   Gemini implicit) discounts the fixed ~1,500-token rubric on each call. It
   is a discount on top; the database cache is what guarantees "once".
7. **Pages are static.** ISR with on-demand revalidation when the run ends.

## Data model

Ten tables cover the beta. The news tables are shared by every user.

| Table | What it holds | Key fields |
| --- | --- | --- |
| users | Account and saved state | id, email, home_state |
| states | All 50 states, live or not | code, name, enabled |
| elections | One row per election | id, state_code, date, name, type |
| races | One office on one ballot | id, election_id, office, district, level |
| candidates | The people running | id, race_id, name, party, incumbent, photo_url, search_terms |
| outlets | News sites seen so far | domain, name, allsides_lean, allsides_url |
| articles | One row per unique story | id, url, canonical_url, outlet_domain, title, published_at, paywalled, body_hash |
| article_analyses | One article's read for one candidate | article_id, candidate_id, prompt_version, model, summary, framing, flags (jsonb with quotes), cache_key |
| candidate_digests | The daily summary per candidate | candidate_id, date, input_hash, bullets (jsonb with source ids), balance counts |
| job_runs | Log of each daily run | started_at, finished_at, articles_found, analyses_new, analyses_cached, model_cost_usd, errors |

Plus `llm_calls` (provider, model, tokens, cached tokens, latency, cost) for
cost tracking. `search_terms` holds name plus office so a candidate who shares
a name with someone famous doesn't pull the wrong stories.

## Tech stack and hosting

| Part | Choice | Why | Cost |
| --- | --- | --- | --- |
| Website | Next.js, TypeScript, Tailwind on Vercel | Phone-friendly, deploys from GitHub on push | Free on Hobby (personal, non-commercial). Pro is $20/month if it ever earns money |
| Sign-in | Supabase Auth, Google provider, allow-list | Built into the database service | Free up to 50,000 monthly users |
| Database | Supabase Postgres | One service for data and sign-in | Free up to 500 MB; pauses after 7 idle days, which the daily run prevents |
| Daily run | Node script on GitHub Actions | Can run for hours | Free within included minutes |
| Models | Vercel AI SDK, provider by config | Cheapest option, no lock-in | See Decisions |

## Decisions

Settled with the owner on October 16, 2026:

- Sign-in: Google only.
- Outlet lean labels: yes, from AllSides, with attribution; non-commercial use.
- Theme: the mockup's calm blue and serif look stays; keep it simple.
- Model: the cheapest workable provider, swappable. Default to be confirmed
  from the comparison the owner receives with this PR.
- Name: NewsLy is a working name; a replacement is being chosen. Until then the
  name lives in one constant so the rename is one line.

Earlier calls, unchanged: real sign-in with the owner as the only beta account;
a Race step in the flow; 12 statewide races; one refresh each morning at 5 AM
Pacific.

## Build order (one pull request each)

0. **This PR.** Repo docs, env example, cloud-session hook.
1. **Skeleton.** Next.js app on Vercel, Supabase project, Google sign-in with
   allow-list, state/election/race screens on seed data, CI.
2. **Daily run.** News search, dedupe, article text, saved to the database;
   dry-run mode; job log.
3. **Analysis.** Provider factory, prompts, schema, cache, per-article analysis
   and daily digest; candidate page; evals.
4. **Tune.** A week of real reading, then adjust flags, sources and the model.

## Sources

- California Secretary of State, certified candidate list for November 3,
  2026: https://www.sos.ca.gov/administration/news-releases-and-advisories/2026-news-releases-and-advisories/california-secretary-state-shirley-n-weber-phd-certifies-candidate-list-november-3-2026-general-election
  (PDF: https://elections.cdn.sos.ca.gov/statewide-elections/2026-general/cert-list-candidates.pdf)
- Election proclamation: https://elections.cdn.sos.ca.gov/statewide-elections/2026-general/proclamation.pdf
- Vercel function limits: https://vercel.com/docs/functions/limitations;
  Hobby fair use: https://vercel.com/docs/limits/fair-use-guidelines
- Supabase pricing: https://supabase.com/pricing; free project pausing:
  https://supabase.com/docs/guides/platform/free-project-pausing
- Google Civic Information API, Representatives API retirement:
  https://groups.google.com/g/google-civicinfo-api/c/9fwFn-dhktA/m/ftUoL83mAwAJ
- AllSides terms of use (CC BY-NC 4.0): https://www.allsides.com/content/terms-use
