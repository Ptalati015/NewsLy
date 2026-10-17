// Dates, countdowns and labels for the screens. Election dates are calendar
// days in the state's own time zone, so they are handled as plain dates.

import type { Candidate, Race } from "@/lib/data/types";

const DAY_MS = 24 * 60 * 60 * 1000;
export const STATE_TIME_ZONE = "America/Los_Angeles";

function utcMidnight(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1);
}

// Today's calendar date (YYYY-MM-DD) in the given time zone.
export function todayIn(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// Whole days from today (in the time zone) until the date. 0 means today,
// negative means the date has passed.
export function daysUntil(
  isoDate: string,
  now: Date,
  timeZone = STATE_TIME_ZONE,
): number {
  return Math.round(
    (utcMidnight(isoDate) - utcMidnight(todayIn(timeZone, now))) / DAY_MS,
  );
}

export function formatElectionDate(
  isoDate: string,
  style: "long" | "short" = "long",
) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: style === "long" ? "long" : undefined,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(utcMidnight(isoDate)));
}

export function countdownLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}

export function raceTitle(race: Pick<Race, "office" | "district">): string {
  return race.district === null
    ? race.office
    : `${race.office}, District ${race.district}`;
}

export function partyLabel(
  candidate: Pick<Candidate, "party">,
  race: Pick<Race, "partisan">,
): string | null {
  if (!race.partisan) return "Nonpartisan";
  if (!candidate.party) return null;
  return /party|preference/i.test(candidate.party)
    ? candidate.party
    : `${candidate.party} Party`;
}

export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

export function countLabel(
  n: number,
  word: string,
  plural = `${word}s`,
): string {
  return `${n} ${n === 1 ? word : plural}`;
}
