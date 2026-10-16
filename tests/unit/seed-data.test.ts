import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  electionFiles,
  sampleCandidatesFile,
  statesFile,
} from "@/lib/data/seed-files";
import { buildSeedSql } from "@/lib/data/seed-sql";
import { createSeedRepo } from "@/lib/data/seed-repo";

const unique = (values: string[]) => new Set(values).size === values.length;

describe("seed files", () => {
  it("list all 50 states once, with only California open", () => {
    expect(statesFile.states).toHaveLength(50);
    expect(unique(statesFile.states.map((s) => s.code))).toBe(true);
    expect(
      statesFile.states.filter((s) => s.enabled).map((s) => s.code),
    ).toEqual(["CA"]);
  });

  it("cover the 12 statewide races of the November 3, 2026 general", () => {
    const [ca] = electionFiles;
    expect(ca?.election).toMatchObject({
      state_code: "CA",
      date: "2026-11-03",
      type: "general",
    });
    expect(ca?.races).toHaveLength(12);
    expect(unique(ca?.races.map((r) => r.slug) ?? [])).toBe(true);
    expect(
      ca?.races
        .filter((r) => r.office === "Board of Equalization")
        .map((r) => r.district),
    ).toEqual([1, 2, 3, 4]);
    expect(
      ca?.races.find((r) => r.slug === "superintendent-of-public-instruction")
        ?.partisan,
    ).toBe(false);
  });

  it("have unique candidate slugs within each race", () => {
    for (const file of electionFiles) {
      for (const race of file.races) {
        expect(unique(race.candidates.map((c) => c.slug)), race.slug).toBe(
          true,
        );
      }
    }
  });

  it("keep sample people to races that exist", () => {
    const slugs = new Set(
      electionFiles.flatMap((f) => f.races.map((r) => r.slug)),
    );
    for (const raceSlug of Object.keys(sampleCandidatesFile.races)) {
      expect(slugs.has(raceSlug), raceSlug).toBe(true);
    }
  });

  it("match supabase/seed.sql (run `npm run seed:sql` after editing data/)", () => {
    const committed = readFileSync(
      new URL("../../supabase/seed.sql", import.meta.url),
      "utf8",
    );
    expect(committed).toBe(buildSeedSql(statesFile, electionFiles));
  });
});

describe("seed repo (demo mode)", () => {
  it("walks state, election, race and candidate", async () => {
    const repo = createSeedRepo();
    const ca = await repo.getState("CA");
    expect(ca?.enabled).toBe(true);
    const [election] = await repo.listElections("CA");
    expect(election?.slug).toBe("2026-11-03-general");
    const governor = await repo.getRace(election!.id, "governor");
    expect(governor?.candidateCount).toBeGreaterThan(0);
    const people = await repo.listCandidates(governor!.id);
    expect(people.length).toBe(governor!.candidateCount);
    // No real candidates are loaded yet, so these are the marked samples.
    expect(people.every((p) => p.sample)).toBe(true);
    expect(await repo.getCandidate(governor!.id, people[0]!.slug)).toEqual(
      people[0],
    );
    expect(await repo.getCandidate(governor!.id, "nobody")).toBeNull();
  });
});
