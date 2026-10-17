// Reads and validates runtime settings. Every value here is safe to read in
// proxy.ts, route handlers and Server Components. Nothing secret is exposed:
// the Supabase publishable key is public by design.

import { z } from "zod";

const days = (fallback: number) =>
  z.coerce.number().int().min(1).max(365).catch(fallback);

const sessionSchema = z.object({
  maxAgeDays: days(30),
  idleDays: days(7),
});

export type SessionPolicy = z.infer<typeof sessionSchema>;

export function getSessionPolicy(env = process.env): SessionPolicy {
  return sessionSchema.parse({
    maxAgeDays: env.SESSION_MAX_AGE_DAYS,
    idleDays: env.SESSION_IDLE_DAYS,
  });
}

export type SupabaseConfig = { url: string; publishableKey: string };

// Returns null until the owner has created the Supabase project and set its
// URL and publishable key. The app then shows a "not set up yet" sign-in
// screen instead of crashing.
export function getSupabaseConfig(env = process.env): SupabaseConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // The legacy anon key works the same way; Supabase is retiring it by the
  // end of 2026, so the publishable key is preferred.
  const publishableKey = (
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();
  if (!url || !publishableKey) return null;
  if (!z.url({ protocol: /^https?$/ }).safeParse(url).success) return null;
  return { url, publishableKey };
}

// Demo mode shows the screens on seed files with a pretend reader, so the UI
// can be developed and tested before any account exists. It only ever runs
// under `next dev`; a production build ignores the flag.
export function isDemoMode(env = process.env): boolean {
  return env.NODE_ENV === "development" && env.NEWSLY_DEMO === "1";
}
