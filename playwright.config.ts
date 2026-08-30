import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  use: {
    // Next.js blocks cross-origin dev assets; keep host as localhost.
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command:
      "doppler run --config dev_personal -- pnpm exec next dev --hostname localhost --port 3000",
    url: "http://localhost:3000/dev/nav-guard",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
