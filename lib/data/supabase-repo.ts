// Reads through Supabase as the signed-in reader, so Row Level Security
// decides what is visible.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Candidate, Election, NewsRepo, Race } from "./types";

type Client = SupabaseClient<Database>;
type Tables = Database["public"]["Tables"];

function fail(what: string, error: { message: string }): never {
  throw new Error(`Could not load ${what}: ${error.message}`);
}

const toElection = (row: Tables["elections"]["Row"]): Election => ({
  id: row.id,
  stateCode: row.state_code,
  slug: row.slug,
  name: row.name,
  date: row.election_date,
  type: row.type as Election["type"],
});

type RaceRow = Tables["races"]["Row"] & { candidates: { count: number }[] };

const toRace = (row: RaceRow): Race => ({
  id: row.id,
  electionId: row.election_id,
  slug: row.slug,
  office: row.office,
  district: row.district,
  level: row.level as Race["level"],
  partisan: row.partisan,
  candidateCount: row.candidates[0]?.count ?? 0,
});

const toCandidate = (row: Tables["candidates"]["Row"]): Candidate => ({
  id: row.id,
  raceId: row.race_id,
  slug: row.slug,
  name: row.name,
  party: row.party,
  ballotDesignation: row.ballot_designation,
  incumbent: row.incumbent,
  sample: false,
});

const RACE_COLUMNS =
  "id, election_id, slug, office, district, level, partisan, sort_order, candidates(count)";

export function createSupabaseRepo(db: Client, userId: string): NewsRepo {
  return {
    async listStates() {
      const { data, error } = await db
        .from("states")
        .select("code, name, enabled")
        .order("name");
      if (error) fail("states", error);
      return data;
    },
    async getState(code) {
      const { data, error } = await db
        .from("states")
        .select("code, name, enabled")
        .eq("code", code)
        .maybeSingle();
      if (error) fail("state", error);
      return data;
    },
    async listElections(stateCode) {
      const { data, error } = await db
        .from("elections")
        .select("*")
        .eq("state_code", stateCode)
        .order("election_date");
      if (error) fail("elections", error);
      return data.map(toElection);
    },
    async getElection(stateCode, slug) {
      const { data, error } = await db
        .from("elections")
        .select("*")
        .eq("state_code", stateCode)
        .eq("slug", slug)
        .maybeSingle();
      if (error) fail("election", error);
      return data ? toElection(data) : null;
    },
    async listRaces(electionId) {
      const { data, error } = await db
        .from("races")
        .select(RACE_COLUMNS)
        .eq("election_id", electionId)
        .order("sort_order");
      if (error) fail("races", error);
      return (data as RaceRow[]).map(toRace);
    },
    async getRace(electionId, slug) {
      const { data, error } = await db
        .from("races")
        .select(RACE_COLUMNS)
        .eq("election_id", electionId)
        .eq("slug", slug)
        .maybeSingle();
      if (error) fail("race", error);
      return data ? toRace(data as RaceRow) : null;
    },
    async listCandidates(raceId) {
      const { data, error } = await db
        .from("candidates")
        .select("*")
        .eq("race_id", raceId)
        .order("sort_order");
      if (error) fail("candidates", error);
      return data.map(toCandidate);
    },
    async getCandidate(raceId, slug) {
      const { data, error } = await db
        .from("candidates")
        .select("*")
        .eq("race_id", raceId)
        .eq("slug", slug)
        .maybeSingle();
      if (error) fail("candidate", error);
      return data ? toCandidate(data) : null;
    },
    async getHomeState() {
      const { data, error } = await db
        .from("profiles")
        .select("home_state")
        .eq("id", userId)
        .maybeSingle();
      if (error) fail("your saved state", error);
      return data?.home_state ?? null;
    },
    async setHomeState(code) {
      const { error } = await db.rpc("set_home_state", { state_code: code });
      if (error) fail("your saved state", error);
    },
  };
}
