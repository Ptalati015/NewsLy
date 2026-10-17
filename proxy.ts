// Runs before every page and route. It refreshes the Supabase session,
// enforces the beta allow-list and the session rules (signed out 30 days
// after sign-in or after 7 idle days, by default), and sends anyone without
// a valid session to the sign-in screen.
//
// Pages and route handlers check the session again (lib/auth/viewer.ts);
// this is the first line, not the only one.

import { NextResponse, type NextRequest } from "next/server";
import { getAllowList } from "@/lib/auth/allow-list";
import { checkSession } from "@/lib/auth/session-check";
import { nowMs } from "@/lib/clock";
import {
  LAST_SEEN_COOKIE,
  SIGNED_IN_COOKIE,
  parseTimestampCookie,
  shouldRefreshLastSeen,
} from "@/lib/auth/session-policy";
import { getSessionPolicy, getSupabaseConfig, isDemoMode } from "@/lib/config";
import { trackingCookieOptions } from "@/lib/supabase/cookies";
import { redirectWithSession, updateSession } from "@/lib/supabase/proxy";
import { absoluteUrl } from "@/lib/http/same-origin";

const PUBLIC_PATHS = new Set(["/sign-in", "/auth/sign-in", "/auth/callback"]);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (isDemoMode()) return NextResponse.next();

  const config = getSupabaseConfig();
  if (!config) {
    // Not set up yet: everything leads to the sign-in screen, which says so.
    if (isPublic) return NextResponse.next();
    return NextResponse.redirect(absoluteUrl(request, "/sign-in"), 303);
  }

  const session = await updateSession(request, config);
  const { claims } = session;

  if (!claims) {
    if (isPublic) return session.response();
    const url = absoluteUrl(request, "/sign-in");
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
    return redirectWithSession(url, session.response());
  }

  // The callback has just created this session and records its start itself.
  if (pathname === "/auth/callback") return session.response();

  const policy = getSessionPolicy();
  const now = nowMs();
  const verdict = checkSession({
    claims,
    readCookie: (name) => request.cookies.get(name)?.value,
    allowList: getAllowList(),
    policy,
    now,
  });

  if (!verdict.ok) {
    // Revoke the session at Supabase too, not just in this browser.
    await session.supabase.auth.signOut({ scope: "local" });
    const url = absoluteUrl(request, "/sign-in");
    url.searchParams.set("reason", verdict.reason);
    const response = redirectWithSession(url, session.response());
    response.cookies.delete(LAST_SEEN_COOKIE);
    response.cookies.delete(SIGNED_IN_COOKIE);
    return response;
  }

  if (pathname === "/sign-in") {
    return redirectWithSession(absoluteUrl(request, "/"), session.response());
  }

  const response = session.response();
  const lastSeen = parseTimestampCookie(
    request.cookies.get(LAST_SEEN_COOKIE)?.value,
  );
  if (shouldRefreshLastSeen(lastSeen, now)) {
    response.cookies.set(
      LAST_SEEN_COOKIE,
      String(now),
      trackingCookieOptions(policy.idleDays),
    );
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
