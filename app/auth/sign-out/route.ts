// Signs the reader out here and at Supabase, which revokes this session's
// refresh token.

import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { LAST_SEEN_COOKIE, SIGNED_IN_COOKIE } from "@/lib/auth/session-policy";
import { getSupabaseConfig } from "@/lib/config";
import { absoluteUrl, isSameOrigin } from "@/lib/http/same-origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (getSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut({ scope: "local" });
  }
  const cookieStore = await cookies();
  cookieStore.delete(LAST_SEEN_COOKIE);
  cookieStore.delete(SIGNED_IN_COOKIE);
  return NextResponse.redirect(
    absoluteUrl(request, "/sign-in?reason=signed_out"),
    303,
  );
}
