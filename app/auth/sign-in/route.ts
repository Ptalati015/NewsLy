// Starts Google sign-in. The sign-in screen posts here; Supabase returns the
// Google consent URL and stores the PKCE verifier in a cookie for the
// callback to use.

import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/safe-next";
import { getSupabaseConfig } from "@/lib/config";
import { absoluteUrl, isSameOrigin } from "@/lib/http/same-origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const back = (reason: string) =>
    NextResponse.redirect(
      absoluteUrl(request, `/sign-in?reason=${reason}`),
      303,
    );
  if (!getSupabaseConfig()) return back("error");

  const form = await request.formData();
  const next = safeNextPath(form.get("next")?.toString());
  const redirectTo = absoluteUrl(request, "/auth/callback");
  if (next !== "/") redirectTo.searchParams.set("next", next);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo.toString(),
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) return back("error");
  return NextResponse.redirect(data.url, 303);
}
