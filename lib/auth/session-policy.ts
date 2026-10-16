// When a signed-in session has to end. Supabase's own time-box and
// inactivity settings are paid-plan features, so the app enforces both rules
// itself (in proxy.ts) and revokes the session when either is broken:
//
// - max age: SESSION_MAX_AGE_DAYS since the reader signed in (default 30)
// - idle: SESSION_IDLE_DAYS since the reader last used the app (default 7)

import type { SessionPolicy } from "@/lib/config";

const DAY_MS = 24 * 60 * 60 * 1000;

// The last-seen cookie is rewritten at most this often, so ordinary browsing
// doesn't set a cookie on every response.
export const LAST_SEEN_REFRESH_MS = 5 * 60 * 1000;

export const LAST_SEEN_COOKIE = "nl_last_seen";
export const SIGNED_IN_COOKIE = "nl_signed_in";

export type SessionEndReason = "max_age" | "idle";

export type SessionVerdict =
  { ok: true; expiresAt: number } | { ok: false; reason: SessionEndReason };

type AmrEntry = { method?: unknown; timestamp?: unknown };

// Supabase puts the sign-in time in the access token's `amr` claim, as
// seconds since the epoch. Unlike `iat`, it does not move when the token is
// refreshed, and it is signed, so the reader can't extend it.
export function signedInAtFromAmr(amr: unknown): number | null {
  if (!Array.isArray(amr)) return null;
  const stamps = amr
    .map((entry: AmrEntry | string) =>
      typeof entry === "object" && entry !== null ? entry.timestamp : null,
    )
    .filter(
      (t): t is number => typeof t === "number" && Number.isFinite(t) && t > 0,
    );
  if (stamps.length === 0) return null;
  return Math.min(...stamps) * 1000;
}

// Cookie values are epoch milliseconds written by this app. Anything else
// counts as missing.
export function parseTimestampCookie(value: string | undefined): number | null {
  if (!value || !/^\d{1,15}$/.test(value)) return null;
  const ms = Number(value);
  return Number.isSafeInteger(ms) && ms > 0 ? ms : null;
}

export function evaluateSession(input: {
  signedInAt: number | null;
  lastSeenAt: number | null;
  now: number;
  policy: SessionPolicy;
}): SessionVerdict {
  const { signedInAt, lastSeenAt, now, policy } = input;
  const maxAgeMs = policy.maxAgeDays * DAY_MS;
  const idleMs = policy.idleDays * DAY_MS;

  // No known sign-in time: treat the session as too old. A fresh sign-in
  // always records one, so this only ends sessions we can't account for.
  if (signedInAt === null || now - signedInAt >= maxAgeMs) {
    return { ok: false, reason: "max_age" };
  }
  // The last-seen cookie is set at sign-in and expires after the idle
  // window, so a missing cookie means the reader was away too long.
  if (lastSeenAt === null || now - lastSeenAt >= idleMs) {
    return { ok: false, reason: "idle" };
  }
  return {
    ok: true,
    expiresAt: Math.min(signedInAt + maxAgeMs, now + idleMs),
  };
}

export function shouldRefreshLastSeen(
  lastSeenAt: number | null,
  now: number,
): boolean {
  return lastSeenAt === null || now - lastSeenAt >= LAST_SEEN_REFRESH_MS;
}

export function dayCountToSeconds(days: number): number {
  return Math.round((days * DAY_MS) / 1000);
}
