// Loads and validates the seed files. Plain JSON imports, so they work in
// Next.js, Vitest and Node alike.

import statesJson from "../../data/states.json" with { type: "json" };
import caGeneralJson from "../../data/ca-2026-general.json" with { type: "json" };
import sampleJson from "../../data/sample/candidates.sample.json" with { type: "json" };
import {
  electionFileSchema,
  sampleCandidatesFileSchema,
  statesFileSchema,
} from "./seed-schema.ts";

export const statesFile = statesFileSchema.parse(statesJson);
export const electionFiles = [electionFileSchema.parse(caGeneralJson)];
export const sampleCandidatesFile =
  sampleCandidatesFileSchema.parse(sampleJson);
