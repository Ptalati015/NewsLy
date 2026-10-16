// What the screens read. Both data sources (Supabase, and the seed files in
// demo mode) return these shapes, so pages don't know which one they use.

export type UsState = {
  code: string; // upper case, e.g. "CA"
  name: string;
  enabled: boolean;
};

export type Election = {
  id: string;
  stateCode: string;
  slug: string;
  name: string;
  date: string; // YYYY-MM-DD, the election day in the state's own time zone
  type: "primary" | "general" | "special";
};

export type Race = {
  id: string;
  electionId: string;
  slug: string;
  office: string;
  district: number | null;
  level: "statewide" | "federal" | "legislative" | "local";
  partisan: boolean;
  candidateCount: number;
};

export type Candidate = {
  id: string;
  raceId: string;
  slug: string;
  name: string;
  party: string | null;
  ballotDesignation: string | null;
  incumbent: boolean;
  // True for the fictional people demo mode shows before the certified list
  // is loaded. Never true for data from the database.
  sample: boolean;
};

export interface NewsRepo {
  listStates(): Promise<UsState[]>;
  getState(code: string): Promise<UsState | null>;
  listElections(stateCode: string): Promise<Election[]>;
  getElection(stateCode: string, slug: string): Promise<Election | null>;
  listRaces(electionId: string): Promise<Race[]>;
  getRace(electionId: string, slug: string): Promise<Race | null>;
  listCandidates(raceId: string): Promise<Candidate[]>;
  getCandidate(raceId: string, slug: string): Promise<Candidate | null>;
  getHomeState(): Promise<string | null>;
  setHomeState(code: string): Promise<void>;
}
