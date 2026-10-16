import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CandidateAvatar } from "@/components/shared/avatar";
import { ChevronRight } from "@/components/shared/icons";
import { Note, PageTitle, SampleBadge } from "@/components/shared/page-title";
import { ScreenSkeleton } from "@/components/shared/skeleton";
import { TopBar } from "@/components/shared/top-bar";
import { getRepo } from "@/lib/auth/viewer";
import {
  candidatePath,
  electionPath,
  loadElection,
  loadRace,
  loadState,
} from "@/lib/data/load";
import { formatElectionDate, partyLabel, raceTitle } from "@/lib/format";

export const metadata: Metadata = { title: "Candidates" };

type Params = PageProps<"/[state]/[election]/[race]">["params"];

export default function RacePage(
  props: PageProps<"/[state]/[election]/[race]">,
) {
  return (
    <Suspense fallback={<ScreenSkeleton rows={2} />}>
      <Candidates params={props.params} />
    </Suspense>
  );
}

async function Candidates({ params }: { params: Params }) {
  const p = await params;
  const repo = await getRepo();
  const state = await loadState(repo, p.state);
  const election = await loadElection(repo, state, p.election);
  const race = await loadRace(repo, election, p.race);
  const candidates = await repo.listCandidates(race.id);
  const sample = candidates.some((c) => c.sample);

  return (
    <main className="pb-10">
      <TopBar back={{ href: electionPath(state, election), label: "Races" }} />
      <PageTitle
        title={raceTitle(race)}
        subtitle={`${election.name} · ${formatElectionDate(election.date, "short")}`}
      >
        {sample ? (
          <SampleBadge>Sample candidates, not the real ballot</SampleBadge>
        ) : null}
      </PageTitle>
      {candidates.length === 0 ? (
        <Note>
          The certified candidate list for this race hasn&apos;t been loaded
          yet.
        </Note>
      ) : (
        <ul className="flex flex-col gap-3 p-4">
          {candidates.map((candidate) => (
            <li key={candidate.id}>
              <Link
                href={candidatePath(state, election, race, candidate)}
                className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4 text-ink no-underline hover:border-field"
              >
                <CandidateAvatar name={candidate.name} />
                <span className="flex grow flex-col gap-0.5">
                  <span className="text-lg font-bold">{candidate.name}</span>
                  <span className="text-sm text-muted">
                    {[
                      partyLabel(candidate, race),
                      candidate.incumbent ? "Incumbent" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <ChevronRight className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Note>
        Each candidate&apos;s latest story and coverage balance appear here once
        the daily news run starts.
      </Note>
    </main>
  );
}
