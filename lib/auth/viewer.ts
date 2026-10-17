import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getAllowList } from "@/lib/auth/allow-list";
import { checkSession } from "@/lib/auth/session-check";
import { nowMs } from "@/lib/clock";
import { getSessionPolicy, getSupabaseConfig, isDemoMode } from "@/lib/config";
import { createSeedRepo } from "@/lib/data/seed-repo";
import { createSupabaseRepo } from "@/lib/data/supabase-repo";
import type { NewsRepo } from "@/lib/data/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Viewer = {
  id: string;
  email: string;
  demo: boolean;
  // When the session ends if the reader keeps using the app (epoch ms).
  expiresAt: number | null;
};

const DEMO_VIEWER: Viewer = {
  id: "demo",
  email: "demo@newsly.invalid",
  demo: true,
  expiresAt: null,
};

// The signed-in reader for this request, or null. Checks the same rules as
// proxy.ts, because a page must never rely on the proxy alone.
export const getViewer = cache(async (): Promise<Viewer | null> => {
  // Who is asking is a per-request question, never a build-time one.
  await connection();
  if (isDemoMode()) return DEMO_VIEWER;
  if (!getSupabaseConfig()) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const cookieStore = await cookies();
  const verdict = checkSession({
    claims,
    readCookie: (name) => cookieStore.get(name)?.value,
    allowList: getAllowList(),
    policy: getSessionPolicy(),
    now: nowMs(),
  });
  if (!verdict.ok) return null;

  return {
    id: claims.sub,
    email: claims.email ?? "",
    demo: false,
    expiresAt: verdict.expiresAt,
  };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  return viewer;
}

// The data source for this request: the seed files in demo mode, otherwise
// Supabase as the signed-in reader.
export const getRepo = cache(async (): Promise<NewsRepo> => {
  const viewer = await requireViewer();
  if (viewer.demo) return createSeedRepo();
  return createSupabaseRepo(await createSupabaseServerClient(), viewer.id);
});
