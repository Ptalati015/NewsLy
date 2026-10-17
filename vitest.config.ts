import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // `server-only` throws outside a React Server Components build.
      "server-only": fileURLToPath(
        new URL("./tests/support/empty.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Tests never reach a real model or a paid service.
    env: { LLM_PROVIDER: "fake" },
  },
});
