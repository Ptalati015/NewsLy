import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/safe-next";

describe("safeNextPath", () => {
  it("keeps paths on this site", () => {
    expect(safeNextPath("/ca/2026-11-03-general")).toBe(
      "/ca/2026-11-03-general",
    );
    expect(safeNextPath("/states?x=1")).toBe("/states?x=1");
  });

  it("refuses anything that could leave the site or loop", () => {
    for (const bad of [
      null,
      undefined,
      "",
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "\\\\evil.example",
      "javascript:alert(1)",
      "/auth/callback?code=x",
      "/sign-in",
      "ca",
    ]) {
      expect(safeNextPath(bad)).toBe("/");
    }
  });
});
