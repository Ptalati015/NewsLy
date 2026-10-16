import { describe, expect, it } from "vitest";
import { isAllowedEmail, parseAllowList } from "@/lib/auth/allow-list";

describe("allow-list", () => {
  it("normalises case and whitespace", () => {
    const list = parseAllowList(" One@Example.com , two@example.com,, ");
    expect([...list]).toEqual(["one@example.com", "two@example.com"]);
    expect(isAllowedEmail("ONE@example.com ", list)).toBe(true);
  });

  it("fails closed when unset or empty", () => {
    expect(isAllowedEmail("one@example.com", parseAllowList(undefined))).toBe(
      false,
    );
    expect(isAllowedEmail("one@example.com", parseAllowList(""))).toBe(false);
    expect(isAllowedEmail(undefined, parseAllowList("one@example.com"))).toBe(
      false,
    );
    expect(isAllowedEmail("", parseAllowList(","))).toBe(false);
  });

  it("matches whole addresses only", () => {
    const list = parseAllowList("one@example.com");
    expect(isAllowedEmail("xone@example.com", list)).toBe(false);
    expect(isAllowedEmail("one@example.com.evil", list)).toBe(false);
  });
});
