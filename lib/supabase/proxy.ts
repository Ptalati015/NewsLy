// Session refresh for proxy.ts, following Supabase's Next.js guide: build a
// client over the request cookies, read the claims (which refreshes the
// access token when it is close to expiry), and carry any cookie writes onto
// the response.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseConfig } from "@/lib/config";
import { authCookieOptions } from "@/lib/supabase/cookies";
import type { Database } from "@/lib/supabase/database.types";

export async function updateSession(
  request: NextRequest,
  config: SupabaseConfig,
) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    config.url,
    config.publishableKey,
    {
      cookieOptions: authCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // Nothing may run between creating the client and this call.
  const { data } = await supabase.auth.getClaims();

  return {
    supabase,
    claims: data?.claims ?? null,
    // The response may be replaced by a token refresh, so read it last.
    response: () => response,
  };
}

// Carries refreshed or cleared auth cookies and the no-cache headers from the
// session response onto a redirect.
export function redirectWithSession(
  url: URL,
  session: NextResponse,
): NextResponse {
  // 303 so a form POST that hits an expired session lands as a plain GET.
  const redirect = NextResponse.redirect(url, 303);
  for (const cookie of session.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = session.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}
