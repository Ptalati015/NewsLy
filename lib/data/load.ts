// Turns URL segments into records, or a 404. Every page in the
// /[state]/[election]/[race]/[candidate] chain loads its parents this way, so
// a mistyped or stale link never renders half a page.

import "server-only";

import { notFound } from "next/navigation";
import type { Candidate, Election, NewsRepo, Race, UsState } from "./types";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function loadState(
  repo: NewsRepo,
  param: string,
): Promise<UsState> {
  if (!/^[a-z]{2}$/.test(param)) notFound();
  return (await repo.getState(param.toUpperCase())) ?? notFound();
}

export async function loadElection(
  repo: NewsRepo,
  state: UsState,
  param: string,
): Promise<Election> {
  if (!state.enabled || !SLUG.test(param)) notFound();
  return (await repo.getElection(state.code, param)) ?? notFound();
}

export async function loadRace(
  repo: NewsRepo,
  election: Election,
  param: string,
): Promise<Race> {
  if (!SLUG.test(param)) notFound();
  return (await repo.getRace(election.id, param)) ?? notFound();
}

export async function loadCandidate(
  repo: NewsRepo,
  race: Race,
  param: string,
): Promise<Candidate> {
  if (!SLUG.test(param)) notFound();
  return (await repo.getCandidate(race.id, param)) ?? notFound();
}

export const statePath = (state: UsState) => `/${state.code.toLowerCase()}`;
export const electionPath = (state: UsState, election: Election) =>
  `${statePath(state)}/${election.slug}`;
export const racePath = (state: UsState, election: Election, race: Race) =>
  `${electionPath(state, election)}/${race.slug}`;
export const candidatePath = (
  state: UsState,
  election: Election,
  race: Race,
  candidate: Candidate,
) => `${racePath(state, election, race)}/${candidate.slug}`;
