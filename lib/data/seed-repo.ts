// Reads the seed files in data/ instead of the database. Used by demo mode
// (and tests) so the screens work before Supabase exists.

import type { ElectionFile } from "./seed-schema.ts";
import { electionFiles, statesFile } from "./seed-files.ts";
import type { Candidate, Election, NewsRepo, Race, UsState } from "./types.ts";

const electionId = (file: ElectionFile) =>
  `${file.election.state_code}:${file.election.slug}`;

function toElection(file: ElectionFile): Election {
  return {
    id: electionId(file),
    stateCode: file.election.state_code,
    slug: file.election.slug,
    name: file.election.name,
    date: file.election.date,
    type: file.election.type,
  };
}

function racesOf(file: ElectionFile): Race[] {
  return file.races.map((race) => ({
    id: `${electionId(file)}/${race.slug}`,
    electionId: electionId(file),
    slug: race.slug,
    office: race.office,
    district: race.district,
    level: race.level,
    partisan: race.partisan,
    candidateCount: race.candidates.length,
  }));
}

function candidatesOf(file: ElectionFile, raceSlug: string): Candidate[] {
  const race = file.races.find((r) => r.slug === raceSlug);
  if (!race) return [];
  const raceId = `${electionId(file)}/${raceSlug}`;
  return race.candidates.map((c) => ({
    id: `${raceId}/${c.slug}`,
    raceId,
    slug: c.slug,
    name: c.name,
    party: c.party,
    ballotDesignation: c.ballot_designation,
    incumbent: c.incumbent,
  }));
}

const fileById = (id: string) =>
  electionFiles.find((f) => electionId(f) === id);

export function createSeedRepo(): NewsRepo {
  return {
    async listStates(): Promise<UsState[]> {
      return [...statesFile.states].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    },
    async getState(code) {
      return statesFile.states.find((s) => s.code === code) ?? null;
    },
    async listElections(stateCode) {
      return electionFiles
        .filter((f) => f.election.state_code === stateCode)
        .map(toElection)
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    async getElection(stateCode, slug) {
      const file = electionFiles.find(
        (f) => f.election.state_code === stateCode && f.election.slug === slug,
      );
      return file ? toElection(file) : null;
    },
    async listRaces(id) {
      const file = fileById(id);
      return file ? racesOf(file) : [];
    },
    async getRace(id, slug) {
      const file = fileById(id);
      return file ? (racesOf(file).find((r) => r.slug === slug) ?? null) : null;
    },
    async listCandidates(raceId) {
      const [id, raceSlug] = raceId.split("/");
      const file = id ? fileById(id) : undefined;
      return file && raceSlug ? candidatesOf(file, raceSlug) : [];
    },
    async getCandidate(raceId, slug) {
      const all = await this.listCandidates(raceId);
      return all.find((c) => c.slug === slug) ?? null;
    },
    // Demo mode has no accounts, so nothing is remembered between visits.
    async getHomeState() {
      return null;
    },
    async setHomeState() {},
  };
}
