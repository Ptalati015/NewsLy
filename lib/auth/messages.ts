// Messages the sign-in screen shows after a redirect. Keyed by the `reason`
// query parameter; unknown reasons show nothing.

import type { SessionPolicy } from "@/lib/config";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const SIGN_IN_REASONS = {
  max_age: (p: SessionPolicy) =>
    `For safety, sessions end ${plural(p.maxAgeDays, "day")} after sign-in. Sign in again to keep reading.`,
  idle: (p: SessionPolicy) =>
    `You were signed out after ${plural(p.idleDays, "day")} away. Sign in again to keep reading.`,
  not_allowed: () =>
    "That Google account isn't on the beta list. Ask the owner to add it.",
  signed_out: () => "You're signed out.",
  cancelled: () => "Sign-in was cancelled.",
  error: () => "Sign-in didn't work. Please try again.",
} as const;

export type SignInReason = keyof typeof SIGN_IN_REASONS;

export function signInMessage(
  reason: string | string[] | undefined,
  policy: SessionPolicy,
): string | null {
  const key = Array.isArray(reason) ? reason[0] : reason;
  if (!key || !Object.hasOwn(SIGN_IN_REASONS, key)) return null;
  return SIGN_IN_REASONS[key as SignInReason](policy);
}
