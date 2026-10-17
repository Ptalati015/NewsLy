import type { JwtPayload } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { parseAllowList } from "@/lib/auth/allow-list";
import { checkSession } from "@/lib/auth/session-check";
import { LAST_SEEN_COOKIE, SIGNED_IN_COOKIE } from "@/lib/auth/session-policy";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 16, 12);
const policy = { maxAgeDays: 30, idleDays: 7 };
const allowList = parseAllowList("reader@example.com");

const claims = (extra: Partial<JwtPayload> = {}): JwtPayload => ({
  iss: "https://example.supabase.co/auth/v1",
  sub: "11111111-1111-1111-1111-111111111111",
  aud: "authenticated",
  exp: now / 1000 + 3600,
  iat: now / 1000,
  role: "authenticated",
  aal: "aal1",
  session_id: "22222222-2222-2222-2222-222222222222",
  email: "Reader@Example.com",
  amr: [{ method: "oauth", timestamp: (now - DAY) / 1000 }],
  ...extra,
});

const cookies =
  (values: Record<string, string>) =>
  (name: string): string | undefined =>
    values[name];

describe("checkSession", () => {
  const active = cookies({ [LAST_SEEN_COOKIE]: String(now - 60_000) });

  it("accepts an allowed, recent, active reader (email case doesn't matter)", () => {
    expect(
      checkSession({
        claims: claims(),
        readCookie: active,
        allowList,
        policy,
        now,
      }).ok,
    ).toBe(true);
  });

  it("refuses accounts that aren't on the beta list", () => {
    expect(
      checkSession({
        claims: claims({ email: "someone@else.com" }),
        readCookie: active,
        allowList,
        policy,
        now,
      }),
    ).toEqual({ ok: false, reason: "not_allowed" });
  });

  it("uses the signed amr time over the cookie, so the cookie can't extend a session", () => {
    const old = claims({
      amr: [{ method: "oauth", timestamp: (now - 31 * DAY) / 1000 }],
    });
    const forged = cookies({
      [LAST_SEEN_COOKIE]: String(now),
      [SIGNED_IN_COOKIE]: String(now),
    });
    expect(
      checkSession({ claims: old, readCookie: forged, allowList, policy, now }),
    ).toEqual({
      ok: false,
      reason: "max_age",
    });
  });

  it("falls back to the sign-in cookie when the token has no amr times", () => {
    const readCookie = cookies({
      [LAST_SEEN_COOKIE]: String(now),
      [SIGNED_IN_COOKIE]: String(now - 2 * DAY),
    });
    expect(
      checkSession({
        claims: claims({ amr: ["oauth"] }),
        readCookie,
        allowList,
        policy,
        now,
      }).ok,
    ).toBe(true);
  });

  it("signs out a reader who was away for a week", () => {
    expect(
      checkSession({
        claims: claims(),
        readCookie: cookies({}),
        allowList,
        policy,
        now,
      }),
    ).toEqual({ ok: false, reason: "idle" });
  });
});
