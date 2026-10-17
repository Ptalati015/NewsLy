import { describe, expect, it } from "vitest";
import { now, nowMs } from "@/lib/clock";

const PINNED = "2026-10-20T12:00:00-07:00";
const env = (values: Record<string, string | undefined>) =>
  values as NodeJS.ProcessEnv;

describe("clock", () => {
  it("can be pinned in demo mode", () => {
    const demo = env({
      NODE_ENV: "development",
      NEWSLY_DEMO: "1",
      NEWSLY_NOW: PINNED,
    });
    expect(nowMs(demo)).toBe(Date.parse(PINNED));
    expect(now(demo).toISOString()).toBe("2026-10-20T19:00:00.000Z");
  });

  it("ignores the pin outside demo mode, and a pin it can't read", () => {
    const before = Date.now();
    for (const values of [
      { NODE_ENV: "production", NEWSLY_DEMO: "1", NEWSLY_NOW: PINNED },
      { NODE_ENV: "development", NEWSLY_NOW: PINNED },
      { NODE_ENV: "development", NEWSLY_DEMO: "1", NEWSLY_NOW: "next tuesday" },
    ]) {
      const ms = nowMs(env(values));
      expect(ms).toBeGreaterThanOrEqual(before);
      expect(ms).toBeLessThanOrEqual(Date.now());
    }
  });
});
