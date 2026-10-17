import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { electionFiles, statesFile } from "@/lib/data/seed-files";
import { buildSeedSql, newsName, searchTerms } from "@/lib/data/seed-sql";
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

  it("hold the certified list: two candidates a race, four incumbents", () => {
    // From the Secretary of State's certified list of August 27, 2026, checked
    // against the PDF on October 17, 2026. Spot checks, not a second copy.
    const [ca] = electionFiles;
    const races = ca?.races ?? [];
    expect(races.every((r) => r.candidates.length === 2)).toBe(true);
    const names = (slug: string) =>
      races.find((r) => r.slug === slug)?.candidates.map((c) => c.name);
    expect(names("governor")).toEqual(["Xavier Becerra", "Steve Hilton"]);
    expect(names("board-of-equalization-4")).toEqual([
      "Tom Umberg",
      "Denis Bilodeau",
    ]);
    expect(
      races
        .flatMap((r) => r.candidates.filter((c) => c.incumbent))
        .map((c) => c.name),
    ).toEqual([
      "Rob Bonta",
      "Shirley N. Weber",
      "Malia M. Cohen",
      "Sally J. Lieber",
    ]);
  });

  it("leave party empty in nonpartisan races and set it everywhere else", () => {
    for (const race of electionFiles.flatMap((f) => f.races)) {
      for (const c of race.candidates) {
        expect(c.party === null, `${race.slug}/${c.slug}`).toBe(!race.partisan);
      }
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
    expect(people.map((p) => p.name)).toEqual([
      "Xavier Becerra",
      "Steve Hilton",
    ]);
    expect(await repo.getCandidate(governor!.id, people[0]!.slug)).toEqual(
      people[0],
    );
    expect(await repo.getCandidate(governor!.id, "nobody")).toBeNull();
  });
});

describe("news search terms", () => {
  it("use the name as stories print it", () => {
    expect(newsName("Donald P. (Don) Wagner")).toBe("Don Wagner");
    expect(newsName("Shirley N. Weber")).toBe("Shirley Weber");
    expect(newsName("Herb W Morgan")).toBe("Herb Morgan");
    expect(newsName("Eleni Kounalakis")).toBe("Eleni Kounalakis");
  });

  it("pair the quoted name with the office", () => {
    expect(
      searchTerms(
        { name: "Sally J. Lieber" },
        { office: "Board of Equalization", district: 2 },
      ),
    ).toEqual(['"Sally Lieber" Board of Equalization, District 2']);
  });
});
