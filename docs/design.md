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

1. **Sign in.** Google only. You stay signed in, but not forever: the session
   ends 30 days after sign-in or after 7 days without use, then you sign in
   again. Standard practice, enforced by the app.
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

**Cost at that volume** (list prices checked October 16, 2026; free tiers
noted). At this size every small model costs a few dollars a month or nothing,
so the real differences are judgment quality, data policy and reliability.

| Option | Monthly cost | Notes |
| --- | --- | --- |
| Vercel AI Gateway, any model below | $0 within the $5/month free credit | One Vercel key, no markup, model is a string; may ask for a card to verify, nothing charged unless credits are bought; the free credit ends after a first purchase |
| Claude Haiku 5.5 | $1.85 list; about $0.95 with batch and prefix caching | Best judgment per dollar for this task; 90% discount on the cached rubric |
| Groq, GPT-OSS-20B | $1.28 | Open-weight model; free tier too small (200K tokens/day) |
| Mistral Small 4 | $2.55 | Free "Experiment" plan trains on your prompts |
| OpenAI GPT-5.4 nano | $4.08 | No free tier or credits |
| Gemini 3.1 Flash-Lite | $0 on the free tier, $5.00 paid | Free tier: Google may use prompts to improve products; daily quota unpublished and has been cut before; no prefix-cache discount at our prompt size |

**Recommended default:** Vercel AI Gateway as the key, `anthropic/claude-haiku-5-5`
as the first model, with Gemini Flash-Lite, Groq GPT-OSS and Mistral Small
compared on the eval set through the same key. If the gateway's card check is
unwanted, the fallback is Gemini Flash-Lite on a Google AI Studio key (no card)
with the data-use trade-off above. Articles are public and no personal data is
sent, so that trade-off is about comfort, not privacy risk.

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
- Model: Claude Haiku 5.5 through the Vercel AI Gateway, with the cache
  strategy above. Confirmed by the owner on October 16, 2026. Still swappable
  by config; other models are compared on the eval set before any switch.
- Sign-in sessions: stay signed in, expire after 30 days or 7 idle days.
- Team: three project threads, Dev, QA and PM, with matching agent files in
  `.claude/agents/`. The owner works through PM. See `AGENTS.md`, "Team".
- Testing budget: tests never call a real model; live runs are opt-in with a
  dollar cap; the daily job has kill switches. See `AGENTS.md`, "Testing and
  cost guardrails".
- Keys and accounts are created by the owner when we say we're ready: Vercel
  (and an AI Gateway key), Supabase, a Google OAuth client.
- Name: NewsLy is a working name. Shortlist after a conflict check on
  October 16, 2026: Clear Slate (recommended; a slate is the list of candidates
  on a ballot), Even Keel, Evenhand. Rejected as taken: Stump, Tilt, Level,
  Candidly, Unspun, Slate Reader. Until chosen, the name lives in one constant
  so the rename is one line.

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

**Step 1 as built (October 16, 2026).** Where the build fills in or departs
from the plan above:

- Screens: `/sign-in`, `/states`, `/ca`, `/ca/2026-11-03-general`,
  `/ca/2026-11-03-general/governor` and one page per candidate, plus
  `/account` (who is signed in, when the session ends, sign out).
- Session expiry is enforced by the app, because Supabase's time-box and
  inactivity settings are paid-plan features: 30 days from the sign-in time
  in the signed access token, 7 days from a last-seen cookie. Either one
  revokes the session at Supabase, not just in the browser.
- The certified candidate list is not loaded yet: the build environment
  can't reach the Secretary of State's site. The 12 races are seeded;
  candidates go into `data/ca-2026-general.json` from the certified PDF and
  are reviewed before they ship.
- Demo mode (`npm run dev:demo`) shows the screens on the seed files with
  fictional sample candidates, labeled as samples, so the UI can be built and
  tested before any account exists. Production builds ignore it.
- The database holds only what step 1 reads (states, elections, races,
  candidates, profiles). News tables arrive with steps 2 and 3.
- Supabase's newer key names: the publishable key in the web app, the secret
  key only in the daily job. Account setup is in `docs/setup.md`.
- Candidate cards show name, party and incumbency for now; the latest
  headline and coverage balance arrive with step 3.

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
