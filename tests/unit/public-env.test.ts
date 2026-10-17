// Anything named NEXT_PUBLIC_ is copied into the browser bundle, so only
// values that are safe to publish may use the prefix. A new NEXT_PUBLIC_ name
// has to be added here on purpose.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../../", import.meta.url);

const SAFE_TO_PUBLISH = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  // The legacy name for the publishable key, still accepted.
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
]);

const SOURCES = [
  "app",
  "components",
  "lib",
  "proxy.ts",
  "next.config.ts",
  ".env.example",
];

function files(path: string): string[] {
  const url = new URL(path, root);
  if (!statSync(url).isDirectory()) return [path];
  return readdirSync(url).flatMap((name) => files(`${path}/${name}`));
}

describe("NEXT_PUBLIC_ variables", () => {
  it("are only the ones that are safe to publish", () => {
    const found = new Set<string>();
    for (const file of SOURCES.flatMap(files)) {
      const text = readFileSync(new URL(file, root), "utf8");
      for (const match of text.matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g))
        found.add(match[0]);
    }
    expect(found.size).toBeGreaterThan(0);
    expect([...found].filter((name) => !SAFE_TO_PUBLISH.has(name))).toEqual([]);
  });
});
