// The home address opens the reader's saved state, or the state picker.

import { NextResponse, type NextRequest } from "next/server";
import { getRepo } from "@/lib/auth/viewer";
import { absoluteUrl } from "@/lib/http/same-origin";

export async function GET(request: NextRequest) {
  const repo = await getRepo();
  const home = await repo.getHomeState();
  const target = home ? `/${home.toLowerCase()}` : "/states";
  return NextResponse.redirect(absoluteUrl(request, target), 303);
}
