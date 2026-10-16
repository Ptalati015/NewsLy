import { defineConfig, devices } from "@playwright/test";

// Two servers, neither of which touches a real service or model:
// - demo: `next dev` in demo mode (seed files, sample candidates, no sign-in)
// - gate: a production build with placeholder Supabase settings, to check
//   that everything is locked behind sign-in. Nothing listens at that URL;
//   no test needs it to.
const DEMO_PORT = 3100;
const GATE_PORT = 3101;
const FAKE_SUPABASE = "http://127.0.0.1:54321";

const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    ...devices["Pixel 7"],
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
    launchOptions: { executablePath },
  },
  projects: [
    {
      name: "demo",
      testMatch: /demo\..*spec\.ts/,
      use: { baseURL: `http://127.0.0.1:${DEMO_PORT}` },
    },
    {
      name: "gate",
      testMatch: /gate\..*spec\.ts/,
      use: { baseURL: `http://127.0.0.1:${GATE_PORT}` },
    },
  ],
  webServer: [
    {
      command: `next dev --port ${DEMO_PORT} --hostname 127.0.0.1`,
      url: `http://127.0.0.1:${DEMO_PORT}/sign-in`,
      env: { NEWSLY_DEMO: "1", LLM_PROVIDER: "fake" },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // Needs `npm run build` first (CI does it in the step before).
      command: `next start --port ${GATE_PORT} --hostname 127.0.0.1`,
      url: `http://127.0.0.1:${GATE_PORT}/sign-in`,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: FAKE_SUPABASE,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_placeholder",
        ALLOWED_EMAILS: "reader@example.com",
        LLM_PROVIDER: "fake",
      },
      // Always a fresh server, so a stale build is never tested.
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
