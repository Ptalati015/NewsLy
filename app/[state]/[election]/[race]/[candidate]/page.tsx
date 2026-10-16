import type { Metadata } from "next";
import { Suspense } from "react";
import { CandidateAvatar } from "@/components/shared/avatar";
import { SampleBadge } from "@/components/shared/page-title";
import { ScreenSkeleton } from "@/components/shared/skeleton";
import { TopBar } from "@/components/shared/top-bar";
import { getRepo } from "@/lib/auth/viewer";
import {
  loadCandidate,
  loadElection,
  loadRace,
  loadState,
  racePath,
} from "@/lib/data/load";
import { partyLabel, raceTitle } from "@/lib/format";

export const metadata: Metadata = { title: "Candidate" };

type Props = PageProps<"/[state]/[election]/[race]/[candidate]">;

export default function CandidatePage(props: Props) {
  return (
    <Suspense fallback={<ScreenSkeleton rows={3} />}>
      <Candidate params={props.params} />
    </Suspense>
  );
}

async function Candidate({ params }: { params: Props["params"] }) {
  const p = await params;
  const repo = await getRepo();
  const state = await loadState(repo, p.state);
  const election = await loadElection(repo, state, p.election);
  const race = await loadRace(repo, election, p.race);
  const candidate = await loadCandidate(repo, race, p.candidate);
  const party = partyLabel(candidate, race);

  return (
    <main className="pb-10">
      <TopBar
        back={{ href: racePath(state, election, race), label: raceTitle(race) }}
      />
      <div className="flex items-center gap-3.5 px-4 pt-3">
        <CandidateAvatar name={candidate.name} size="lg" />
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] leading-8 font-bold tracking-tight">
            {candidate.name}
          </h1>
          <span className="text-[15px] text-muted">
            {[party, `running for ${raceTitle(race)}`]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 px-4 pt-3">
        {candidate.sample ? (
          <SampleBadge>Sample candidate, not a real person</SampleBadge>
        ) : null}
        {candidate.incumbent ? (
          <span className="mt-1 rounded-md bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">
            Incumbent
          </span>
        ) : null}
      </div>
      {candidate.ballotDesignation ? (
        <p className="px-4 pt-2 text-sm text-muted">
          On the ballot as: {candidate.ballotDesignation}
        </p>
      ) : null}
      <section className="mx-4 mt-4 flex flex-col gap-2 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-lg font-bold">This week</h2>
        <p className="text-[15px] leading-[23px] text-ink-2">
          No coverage yet. Once the daily news run starts, a summary of this
          week&apos;s stories appears here, with bias flags on every article it
          drew from.
        </p>
      </section>
    </main>
  );
}
