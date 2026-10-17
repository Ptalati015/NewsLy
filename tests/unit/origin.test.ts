import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  isSameOrigin,
  requestOrigin,
} from "@/lib/http/same-origin";

const req = (
  headers: Record<string, string>,
  url = "http://localhost:3000/x",
) => new Request(url, { method: "POST", headers });

describe("requestOrigin", () => {
  it("prefers the forwarded host from Vercel's edge", () => {
    expect(
      requestOrigin(
        req({
          host: "internal:3000",
          "x-forwarded-host": "newsly.vercel.app",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe("https://newsly.vercel.app");
  });

  it("uses the Host header, then the request URL", () => {
    expect(requestOrigin(req({ host: "127.0.0.1:3101" }))).toBe(
      "http://127.0.0.1:3101",
    );
    expect(requestOrigin(req({}))).toBe("http://localhost:3000");
  });

  it("ignores malformed hosts", () => {
    expect(requestOrigin(req({ host: "evil.example/path" }))).toBe(
      "http://localhost:3000",
    );
    expect(requestOrigin(req({ "x-forwarded-host": "a b" }))).toBe(
      "http://localhost:3000",
    );
  });

  it("builds absolute URLs on that origin", () => {
    expect(
      absoluteUrl(req({ host: "127.0.0.1:3101" }), "/sign-in?reason=x").href,
    ).toBe("http://127.0.0.1:3101/sign-in?reason=x");
  });
});

describe("isSameOrigin", () => {
  it("accepts posts from the site itself", () => {
    expect(
      isSameOrigin(
        req({ host: "127.0.0.1:3101", origin: "http://127.0.0.1:3101" }),
      ),
    ).toBe(true);
  });

  it("refuses missing, foreign or look-alike origins", () => {
    expect(isSameOrigin(req({ host: "app.test" }))).toBe(false);
    expect(
      isSameOrigin(req({ host: "app.test", origin: "https://evil.example" })),
    ).toBe(false);
    expect(
      isSameOrigin(
        req({ host: "app.test", origin: "http://app.test.evil.example" }),
      ),
    ).toBe(false);
    expect(isSameOrigin(req({ host: "app.test", origin: "null" }))).toBe(false);
    expect(
      isSameOrigin(
        req({
          host: "app.test",
          "x-forwarded-proto": "https",
          origin: "http://app.test",
        }),
      ),
    ).toBe(false);
  });
});
