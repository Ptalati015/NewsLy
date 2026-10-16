// Shapes of the hand-maintained seed files in data/. Kept free of "@/"
// imports so scripts/build-seed-sql.ts can load it with plain Node.

import { z } from "zod";

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lowercase words joined by hyphens");

export const statesFileSchema = z.object({
  states: z.array(
    z.object({
      code: z.string().regex(/^[A-Z]{2}$/),
      name: z.string().min(1),
      enabled: z.boolean(),
    }),
  ),
});

export const candidateSeedSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1),
  party: z.string().min(1).nullable(),
  ballot_designation: z.string().min(1).nullable(),
  incumbent: z.boolean(),
});

export const raceSeedSchema = z.object({
  slug: slugSchema,
  office: z.string().min(1),
  district: z.number().int().positive().nullable(),
  level: z.enum(["statewide", "federal", "legislative", "local"]),
  partisan: z.boolean(),
  candidates: z.array(candidateSeedSchema),
});

export const electionFileSchema = z.object({
  source: z.object({
    note: z.string(),
    certified_on: z.iso.date(),
    pdf: z.url(),
    release: z.url(),
  }),
  election: z.object({
    state_code: z.string().regex(/^[A-Z]{2}$/),
    slug: slugSchema,
    name: z.string().min(1),
    date: z.iso.date(),
    type: z.enum(["primary", "general", "special"]),
  }),
  races: z.array(raceSeedSchema),
});

export const sampleCandidatesFileSchema = z.object({
  note: z.string(),
  races: z.record(slugSchema, z.array(candidateSeedSchema)),
});

export type StatesFile = z.infer<typeof statesFileSchema>;
export type ElectionFile = z.infer<typeof electionFileSchema>;
export type RaceSeed = z.infer<typeof raceSeedSchema>;
export type CandidateSeed = z.infer<typeof candidateSeedSchema>;
export type SampleCandidatesFile = z.infer<typeof sampleCandidatesFileSchema>;
