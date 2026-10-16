// Google sends the reader back here (through Supabase) with a one-time code.
// Exchange it for a session, refuse accounts that aren't on the beta list,
// and record when the session started for the expiry rules.
//
// The beta list lives in two places: ALLOWED_EMAILS, which the app checks on
// every request, and public.allowed_emails, which keeps the data itself locked.
// Both are checked here so a reader missing from either one is told so,
// instead of signing in to empty screens.

import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getAllowList, isAllowedEmail } from "@/lib/auth/allow-list";
import { safeNextPath } from "@/lib/auth/safe-next";
import { nowMs } from "@/lib/clock";
import { LAST_SEEN_COOKIE, SIGNED_IN_COOKIE } from "@/lib/auth/session-policy";
import { getSessionPolicy, getSupabaseConfig } from "@/lib/config";
import { trackingCookieOptions } from "@/lib/supabase/cookies";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/http/same-origin";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const back = (reason: string) =>
    NextResponse.redirect(
      absoluteUrl(request, `/sign-in?reason=${reason}`),
      303,
    );

  const oauthError = params.get("error");
  if (oauthError)
    return back(oauthError === "access_denied" ? "cancelled" : "error");

  const code = params.get("code");
  if (!code || !getSupabaseConfig()) return back("error");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return back("error");

  if (!isAllowedEmail(data.user.email, getAllowList())) {
    await supabase.auth.signOut({ scope: "local" });
    return back("not_allowed");
  }

  const listed = await supabase.rpc("is_allowed");
  if (listed.error || listed.data !== true) {
    await supabase.auth.signOut({ scope: "local" });
    return back(listed.error ? "error" : "not_allowed");
  }

  const policy = getSessionPolicy();
  const now = String(nowMs());
  const cookieStore = await cookies();
  cookieStore.set(
    SIGNED_IN_COOKIE,
    now,
    trackingCookieOptions(policy.maxAgeDays),
  );
  cookieStore.set(
    LAST_SEEN_COOKIE,
    now,
    trackingCookieOptions(policy.idleDays),
  );

  return NextResponse.redirect(
    absoluteUrl(request, safeNextPath(params.get("next"))),
    303,
  );
}
