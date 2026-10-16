import { describe, expect, it } from "vitest";
import { signInMessage } from "@/lib/auth/messages";
import { getSessionPolicy, getSupabaseConfig, isDemoMode } from "@/lib/config";

const env = (values: Record<string, string>) =>
  values as unknown as NodeJS.ProcessEnv;

describe("getSessionPolicy", () => {
  it("defaults to 30 days, or 7 idle days", () => {
    expect(getSessionPolicy(env({}))).toEqual({ maxAgeDays: 30, idleDays: 7 });
  });

  it("reads overrides and ignores nonsense", () => {
    expect(
      getSessionPolicy(
        env({ SESSION_MAX_AGE_DAYS: "14", SESSION_IDLE_DAYS: "3" }),
      ),
    ).toEqual({ maxAgeDays: 14, idleDays: 3 });
    expect(
      getSessionPolicy(
        env({ SESSION_MAX_AGE_DAYS: "forever", SESSION_IDLE_DAYS: "0" }),
      ),
    ).toEqual({ maxAgeDays: 30, idleDays: 7 });
  });
});

describe("getSupabaseConfig", () => {
  it("is null until both values are set", () => {
    expect(getSupabaseConfig(env({}))).toBeNull();
    expect(
      getSupabaseConfig(
        env({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co" }),
      ),
    ).toBeNull();
    expect(
      getSupabaseConfig(
        env({
          NEXT_PUBLIC_SUPABASE_URL: "not a url",
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "k",
        }),
      ),
    ).toBeNull();
  });

  it("prefers the publishable key and accepts the legacy anon key", () => {
    const url = "https://x.supabase.co";
    expect(
      getSupabaseConfig(
        env({
          NEXT_PUBLIC_SUPABASE_URL: url,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_1",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy",
        }),
      ),
    ).toEqual({ url, publishableKey: "sb_publishable_1" });
    expect(
      getSupabaseConfig(
        env({
          NEXT_PUBLIC_SUPABASE_URL: url,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy",
        }),
      ),
    ).toEqual({ url, publishableKey: "legacy" });
  });
});

describe("isDemoMode", () => {
  it("only runs under next dev", () => {
    expect(isDemoMode(env({ NODE_ENV: "development", NEWSLY_DEMO: "1" }))).toBe(
      true,
    );
    expect(isDemoMode(env({ NODE_ENV: "production", NEWSLY_DEMO: "1" }))).toBe(
      false,
    );
    expect(isDemoMode(env({ NODE_ENV: "test", NEWSLY_DEMO: "1" }))).toBe(false);
    expect(isDemoMode(env({ NODE_ENV: "development" }))).toBe(false);
  });
});

describe("signInMessage", () => {
  const policy = { maxAgeDays: 30, idleDays: 7 };
  it("explains why the reader is back at sign-in", () => {
    expect(signInMessage("max_age", policy)).toContain("30 days after sign-in");
    expect(signInMessage("idle", policy)).toContain("7 days away");
    expect(signInMessage(["not_allowed"], policy)).toContain("beta list");
  });
  it("ignores unknown reasons", () => {
    expect(signInMessage("constructor", policy)).toBeNull();
    expect(signInMessage(undefined, policy)).toBeNull();
  });
});
