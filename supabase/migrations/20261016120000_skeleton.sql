-- Build step 1: the reference tables behind the first five screens, plus each
-- reader's saved state. News tables (outlets, articles, analyses, digests,
-- job runs, model calls) arrive with build steps 2 and 3.
--
-- Access rules: Row Level Security is on for every table. Signed-in readers
-- may read the reference tables and their own profile; only the service role
-- (the daily job and seed scripts) writes reference data. Anonymous visitors
-- get nothing.

create table public.states (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  name text not null unique,
  enabled boolean not null default false
);

create table public.elections (
  id uuid primary key default gen_random_uuid(),
  state_code text not null references public.states (code),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  election_date date not null,
  type text not null check (type in ('primary', 'general', 'special')),
  unique (state_code, slug)
);

create table public.races (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  office text not null,
  district integer check (district is null or district > 0),
  level text not null check (level in ('statewide', 'federal', 'legislative', 'local')),
  partisan boolean not null default true,
  sort_order integer not null default 0,
  unique (election_id, slug)
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  party text,
  ballot_designation text,
  incumbent boolean not null default false,
  photo_url text,
  -- Name plus office, so a candidate who shares a name with someone famous
  -- doesn't pull the wrong stories (used by the daily run).
  search_terms text[] not null default '{}',
  sort_order integer not null default 0,
  unique (race_id, slug)
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  home_state text references public.states (code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.states enable row level security;
alter table public.elections enable row level security;
alter table public.races enable row level security;
alter table public.candidates enable row level security;
alter table public.profiles enable row level security;

-- Grants are explicit rather than relying on project defaults.
revoke all on public.states, public.elections, public.races, public.candidates, public.profiles
  from anon, authenticated;
grant select on public.states, public.elections, public.races, public.candidates
  to authenticated;
grant select, insert, update (home_state, updated_at) on public.profiles to authenticated;

create policy "Signed-in readers can read states"
  on public.states for select to authenticated using (true);
create policy "Signed-in readers can read elections"
  on public.elections for select to authenticated using (true);
create policy "Signed-in readers can read races"
  on public.races for select to authenticated using (true);
create policy "Signed-in readers can read candidates"
  on public.candidates for select to authenticated using (true);

create policy "Readers can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "Readers can create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "Readers can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Saves the reader's state so the state picker is skipped next time. Runs as
-- the caller, so the profile policies above still apply.
create function public.set_home_state(state_code text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.states s where s.code = state_code and s.enabled
  ) then
    raise exception 'State % is not available', state_code using errcode = '22023';
  end if;
  insert into public.profiles (id, home_state)
  values (auth.uid(), state_code)
  on conflict (id) do update
    set home_state = excluded.home_state, updated_at = now();
end;
$$;

revoke execute on function public.set_home_state(text) from public, anon;
grant execute on function public.set_home_state(text) to authenticated;
