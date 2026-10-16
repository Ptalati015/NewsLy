import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "@/components/shared/icons";
import {
  Note,
  PageTitle,
  SectionHeading,
} from "@/components/shared/page-title";
import { ScreenSkeleton } from "@/components/shared/skeleton";
import { TopBar } from "@/components/shared/top-bar";
import { getRepo } from "@/lib/auth/viewer";
import { electionPath, loadState } from "@/lib/data/load";
import type { Election, NewsRepo, UsState } from "@/lib/data/types";
import {
  countLabel,
  countdownLabel,
  daysUntil,
  formatElectionDate,
} from "@/lib/format";

export const metadata: Metadata = { title: "Elections" };

export default function StatePage(props: PageProps<"/[state]">) {
  return (
    <Suspense fallback={<ScreenSkeleton rows={2} />}>
      <Elections params={props.params} />
    </Suspense>
  );
}

async function Elections({
  params,
}: {
  params: PageProps<"/[state]">["params"];
}) {
  const repo = await getRepo();
  const state = await loadState(repo, (await params).state);
  if (!state.enabled) return <ComingSoon state={state} />;

  const now = new Date();
  const elections = await repo.listElections(state.code);
  const upcoming = elections.filter((e) => daysUntil(e.date, now) >= 0);
  const past = elections.filter((e) => daysUntil(e.date, now) < 0).reverse();

  return (
    <main className="pb-10">
      <TopBar back={{ href: "/states", label: "States" }} />
      <PageTitle title={state.name} subtitle="Elections we're following" />
      <SectionHeading>Upcoming</SectionHeading>
      {upcoming.length === 0 ? (
        <Note>No upcoming elections yet.</Note>
      ) : (
        <div className="mx-4 flex flex-col gap-3">
          {upcoming.map((election) => (
            <UpcomingCard
              key={election.id}
              repo={repo}
              state={state}
              election={election}
              days={daysUntil(election.date, now)}
            />
          ))}
        </div>
      )}
      {past.length > 0 ? (
        <>
          <SectionHeading>Past</SectionHeading>
          <ul className="mx-4 flex flex-col gap-3">
            {past.map((election) => (
              <li key={election.id}>
                <Link
                  href={electionPath(state, election)}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4 text-ink no-underline"
                >
                  <span className="flex grow flex-col gap-1">
                    <span className="text-[17px] font-semibold">
                      {election.name}
                    </span>
                    <span className="text-sm text-muted">
                      {formatElectionDate(election.date)}
                    </span>
                  </span>
                  <span className="text-[13px] text-muted">Archived</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <Note>Special elections are added here when they&apos;re called.</Note>
    </main>
  );
}

async function UpcomingCard({
  repo,
  state,
  election,
  days,
}: {
  repo: NewsRepo;
  state: UsState;
  election: Election;
  days: number;
}) {
  const races = await repo.listRaces(election.id);
  const statewide = races.filter((r) => r.level === "statewide").length;
  return (
    <Link
      href={electionPath(state, election)}
      className="flex flex-col gap-3.5 rounded-2xl border border-line bg-card px-4 py-[18px] text-ink no-underline"
    >
      <span className="flex items-start gap-3">
        <span className="flex grow flex-col gap-1">
          <span className="text-xl leading-[26px] font-bold">
            {election.name}
          </span>
          <span className="text-[15px] leading-[22px] text-muted">
            {formatElectionDate(election.date)}
          </span>
        </span>
        <span className="flex min-w-16 flex-col items-center justify-center rounded-xl bg-accent px-2.5 py-2 text-white">
          {days > 1 ? (
            <>
              <span className="text-2xl leading-[26px] font-bold">{days}</span>
              <span className="text-xs leading-4 font-medium">days</span>
            </>
          ) : (
            <span className="text-sm font-bold">{countdownLabel(days)}</span>
          )}
        </span>
      </span>
      <span className="flex items-center gap-2 border-t border-line-soft pt-3">
        <span className="grow text-sm text-ink-2">
          {countLabel(statewide, "statewide race")}
        </span>
        <span className="text-sm font-semibold text-accent">View races</span>
        <ChevronRight size={16} className="text-accent" />
      </span>
    </Link>
  );
}

function ComingSoon({ state }: { state: UsState }) {
  return (
    <main className="pb-10">
      <TopBar back={{ href: "/states", label: "States" }} />
      <PageTitle title={state.name} subtitle="Coming soon" />
      <Note>
        The beta covers California first. {state.name} opens up after that.
      </Note>
    </main>
  );
}
