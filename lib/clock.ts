// The one place the app reads the current time, so tests can set the date
// instead of waiting for it. Session expiry and election countdowns both use
// it.
//
// NEWSLY_NOW (an ISO date-time, e.g. 2026-10-20T12:00:00-07:00) pins the
// clock, but only in demo mode, which itself only works under `next dev`.
// Production always uses the real time.

import { isDemoMode } from "@/lib/config";

export function nowMs(env = process.env): number {
  if (isDemoMode(env) && env.NEWSLY_NOW) {
    const pinned = Date.parse(env.NEWSLY_NOW);
    if (Number.isFinite(pinned)) return pinned;
  }
  return Date.now();
}

export function now(env = process.env): Date {
  return new Date(nowMs(env));
}
