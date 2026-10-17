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
import { now } from "@/lib/clock";
import { loadElection, loadState, racePath, statePath } from "@/lib/data/load";
import type { Race } from "@/lib/data/types";
import {
  countLabel,
  countdownLabel,
  daysUntil,
  formatElectionDate,
} from "@/lib/format";

export const metadata: Metadata = { title: "Races" };

export default function ElectionPage(props: PageProps<"/[state]/[election]">) {
  return (
    <Suspense fallback={<ScreenSkeleton rows={8} />}>
      <Races params={props.params} />
    </Suspense>
  );
}

// Offices with one seat statewide come first; offices elected by district
// (the Board of Equalization) are grouped under the office name.
function groupRaces(races: Race[]): { heading: string; races: Race[] }[] {
  const groups = new Map<string, Race[]>();
  for (const race of races) {
    const heading = race.district === null ? "Statewide offices" : race.office;
    groups.set(heading, [...(groups.get(heading) ?? []), race]);
  }
  return [...groups].map(([heading, list]) => ({ heading, races: list }));
}

function raceMeta(race: Race): string {
  const parts = [];
  if (!race.partisan) parts.push("Nonpartisan");
  parts.push(
    race.candidateCount > 0
      ? countLabel(race.candidateCount, "candidate")
      : "Candidates not loaded yet",
  );
  return parts.join(" · ");
}

async function Races({
  params,
}: {
  params: PageProps<"/[state]/[election]">["params"];
}) {
  const p = await params;
  const repo = await getRepo();
  const state = await loadState(repo, p.state);
  const election = await loadElection(repo, state, p.election);
  const races = await repo.listRaces(election.id);
  const days = daysUntil(election.date, now());
  const when =
    days >= 0
      ? `${formatElectionDate(election.date, "short")} · ${countdownLabel(days)}`
      : formatElectionDate(election.date, "short");

  return (
    <main className="pb-10">
      <TopBar back={{ href: statePath(state), label: "Elections" }} />
      <PageTitle title={election.name} subtitle={`${state.name} · ${when}`} />
      {groupRaces(races).map((group) => (
        <section key={group.heading}>
          <SectionHeading>{group.heading}</SectionHeading>
          <ul className="mx-4 flex flex-col overflow-hidden rounded-[14px] border border-line bg-card">
            {group.races.map((race) => (
              <li
                key={race.id}
                className="border-b border-line-soft last:border-b-0"
              >
                <Link
                  href={racePath(state, election, race)}
                  className="flex min-h-14 items-center gap-3 px-4 py-2 text-ink no-underline hover:bg-line-soft"
                >
                  <span className="flex grow flex-col gap-0.5">
                    <span className="text-base font-semibold">
                      {race.district === null
                        ? race.office
                        : `District ${race.district}`}
                    </span>
                    <span className="text-[13px] text-muted">
                      {raceMeta(race)}
                    </span>
                  </span>
                  <ChevronRight className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Note>
        US House and state legislature races come after the statewide beta.
      </Note>
    </main>
  );
}
