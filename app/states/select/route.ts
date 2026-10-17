// The state picker posts here. Saves the choice so the picker is skipped
// next time, then opens that state's elections.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getRepo } from "@/lib/auth/viewer";
import { absoluteUrl, isSameOrigin } from "@/lib/http/same-origin";

const formSchema = z.object({ state: z.string().regex(/^[A-Z]{2}$/) });

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const parsed = formSchema.safeParse(
    Object.fromEntries(await request.formData()),
  );
  if (!parsed.success) {
    return new NextResponse("Unknown state", { status: 400 });
  }
  const repo = await getRepo();
  const state = await repo.getState(parsed.data.state);
  if (!state?.enabled) {
    return new NextResponse("That state isn't available yet", { status: 400 });
  }
  await repo.setHomeState(state.code);
  return NextResponse.redirect(
    absoluteUrl(request, `/${state.code.toLowerCase()}`),
    303,
  );
}
