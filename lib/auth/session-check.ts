// The session rules applied to one request: allow-list plus expiry. Shared by
// proxy.ts (which can revoke the session) and the page-level checks.

import type { JwtPayload } from "@supabase/supabase-js";
import { isAllowedEmail } from "@/lib/auth/allow-list";
import {
  LAST_SEEN_COOKIE,
  SIGNED_IN_COOKIE,
  evaluateSession,
  parseTimestampCookie,
  signedInAtFromAmr,
  type SessionVerdict,
} from "@/lib/auth/session-policy";
import type { SessionPolicy } from "@/lib/config";

export type SessionCheck =
  SessionVerdict | { ok: false; reason: "not_allowed" };

export function checkSession(input: {
  claims: JwtPayload;
  readCookie: (name: string) => string | undefined;
  allowList: ReadonlySet<string>;
  policy: SessionPolicy;
  now: number;
}): SessionCheck {
  const { claims, readCookie, allowList, policy, now } = input;
  if (!isAllowedEmail(claims.email, allowList)) {
    return { ok: false, reason: "not_allowed" };
  }
  return evaluateSession({
    signedInAt:
      signedInAtFromAmr(claims.amr) ??
      parseTimestampCookie(readCookie(SIGNED_IN_COOKIE)),
    lastSeenAt: parseTimestampCookie(readCookie(LAST_SEEN_COOKIE)),
    now,
    policy,
  });
}
