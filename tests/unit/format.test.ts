import { describe, expect, it } from "vitest";
import {
  countdownLabel,
  daysUntil,
  formatElectionDate,
  initials,
  partyLabel,
  raceTitle,
  todayIn,
} from "@/lib/format";

describe("daysUntil", () => {
  it("counts calendar days in Pacific time", () => {
    // 6 AM UTC on Oct 17 is still Oct 16 in California.
    const now = new Date(Date.UTC(2026, 9, 17, 6, 0));
    expect(todayIn("America/Los_Angeles", now)).toBe("2026-10-16");
    expect(daysUntil("2026-11-03", now)).toBe(18);
  });

  it("is 0 on election day and negative after", () => {
    const electionDay = new Date(Date.UTC(2026, 10, 3, 20));
    expect(daysUntil("2026-11-03", electionDay)).toBe(0);
    expect(daysUntil("2026-06-02", electionDay)).toBeLessThan(0);
  });

  it("survives the daylight-saving change on Nov 1", () => {
    expect(daysUntil("2026-11-03", new Date(Date.UTC(2026, 9, 31, 19)))).toBe(
      3,
    );
  });
});

describe("labels", () => {
  it("formats election dates without shifting the day", () => {
    expect(formatElectionDate("2026-11-03")).toBe("Tuesday, November 3, 2026");
    expect(formatElectionDate("2026-11-03", "short")).toBe("November 3, 2026");
  });

  it("names countdowns", () => {
    expect(countdownLabel(0)).toBe("Today");
    expect(countdownLabel(1)).toBe("Tomorrow");
    expect(countdownLabel(18)).toBe("18 days");
  });

  it("titles district races", () => {
    expect(raceTitle({ office: "Governor", district: null })).toBe("Governor");
    expect(raceTitle({ office: "Board of Equalization", district: 2 })).toBe(
      "Board of Equalization, District 2",
    );
  });

  it("labels parties", () => {
    expect(partyLabel({ party: "Democratic" }, { partisan: true })).toBe(
      "Democratic Party",
    );
    expect(
      partyLabel({ party: "No Party Preference" }, { partisan: true }),
    ).toBe("No Party Preference");
    expect(partyLabel({ party: null }, { partisan: false })).toBe(
      "Nonpartisan",
    );
    expect(partyLabel({ party: null }, { partisan: true })).toBeNull();
  });

  it("makes initials", () => {
    expect(initials("Alex Rivera")).toBe("AR");
    expect(initials("Cher")).toBe("C");
    expect(initials("Mary Ann  de la Cruz")).toBe("MC");
  });
});
