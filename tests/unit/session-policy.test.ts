import { describe, expect, it } from "vitest";
import {
  LAST_SEEN_REFRESH_MS,
  evaluateSession,
  parseTimestampCookie,
  shouldRefreshLastSeen,
  signedInAtFromAmr,
} from "@/lib/auth/session-policy";

const DAY = 24 * 60 * 60 * 1000;
const policy = { maxAgeDays: 30, idleDays: 7 };
const now = Date.UTC(2026, 9, 16, 12, 0, 0);

describe("signedInAtFromAmr", () => {
  it("reads the earliest timestamp, in milliseconds", () => {
    expect(
      signedInAtFromAmr([
        { method: "mfa/totp", timestamp: 1_760_000_500 },
        { method: "oauth", timestamp: 1_760_000_000 },
      ]),
    ).toBe(1_760_000_000_000);
  });

  it("returns null when there is no usable timestamp", () => {
    expect(signedInAtFromAmr(undefined)).toBeNull();
    expect(signedInAtFromAmr(["oauth"])).toBeNull();
    expect(
      signedInAtFromAmr([{ method: "oauth", timestamp: "soon" }]),
    ).toBeNull();
    expect(signedInAtFromAmr([])).toBeNull();
  });
});

describe("evaluateSession", () => {
  const fresh = {
    signedInAt: now - DAY,
    lastSeenAt: now - 60_000,
    now,
    policy,
  };

  it("keeps a recent, active session and reports when it would end", () => {
    expect(evaluateSession(fresh)).toEqual({
      ok: true,
      expiresAt: now + 7 * DAY,
    });
  });

  it("ends the session 30 days after sign-in even if the reader is active", () => {
    expect(evaluateSession({ ...fresh, signedInAt: now - 30 * DAY })).toEqual({
      ok: false,
      reason: "max_age",
    });
    expect(
      evaluateSession({ ...fresh, signedInAt: now - 30 * DAY + 1 }).ok,
    ).toBe(true);
  });

  it("caps the reported end at the 30-day limit", () => {
    const verdict = evaluateSession({ ...fresh, signedInAt: now - 28 * DAY });
    expect(verdict).toEqual({ ok: true, expiresAt: now + 2 * DAY });
  });

  it("ends the session after 7 days without use", () => {
    expect(evaluateSession({ ...fresh, lastSeenAt: now - 7 * DAY })).toEqual({
      ok: false,
      reason: "idle",
    });
    expect(
      evaluateSession({ ...fresh, lastSeenAt: now - 7 * DAY + 1 }).ok,
    ).toBe(true);
  });

  it("treats a missing last-seen cookie as idle and a missing start as too old", () => {
    expect(evaluateSession({ ...fresh, lastSeenAt: null })).toEqual({
      ok: false,
      reason: "idle",
    });
    expect(evaluateSession({ ...fresh, signedInAt: null })).toEqual({
      ok: false,
      reason: "max_age",
    });
  });

  it("follows custom limits", () => {
    const short = { maxAgeDays: 1, idleDays: 1 };
    expect(evaluateSession({ ...fresh, policy: short }).ok).toBe(false);
  });
});

describe("cookie timestamps", () => {
  it("accepts only plain epoch milliseconds", () => {
    expect(parseTimestampCookie("1760000000000")).toBe(1_760_000_000_000);
    for (const bad of [
      undefined,
      "",
      "abc",
      "-5",
      "1e12",
      "0",
      "12345678901234567890",
    ]) {
      expect(parseTimestampCookie(bad)).toBeNull();
    }
  });

  it("rewrites last-seen at most every few minutes", () => {
    expect(shouldRefreshLastSeen(null, now)).toBe(true);
    expect(shouldRefreshLastSeen(now - LAST_SEEN_REFRESH_MS + 1, now)).toBe(
      false,
    );
    expect(shouldRefreshLastSeen(now - LAST_SEEN_REFRESH_MS, now)).toBe(true);
  });
});
