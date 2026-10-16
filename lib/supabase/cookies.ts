// Cookie settings shared by every Supabase client in this app. The session
// is only ever read on the server, so the auth cookies are HttpOnly.

import type { CookieOptions } from "@supabase/ssr";
import { dayCountToSeconds } from "@/lib/auth/session-policy";

export const authCookieOptions: CookieOptions = {
  path: "/",
  sameSite: "lax",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};

// Options for the app's own session-tracking cookies (sign-in time and last
// activity). The browser drops the last-seen cookie after the idle window.
export function trackingCookieOptions(days: number): CookieOptions {
  return { ...authCookieOptions, maxAge: dayCountToSeconds(days) };
}
