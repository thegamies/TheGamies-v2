import { defineConfig, devices } from "@playwright/test";

/**
 * Read-only signed-in checks against a deployed staging app.
 * Run `pnpm qa:fixtures` first; it writes e2e/.auth/fixtures.json.
 */
export default defineConfig({
  testDir: "./e2e/staging",
  globalSetup: "./e2e/staging/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report-staging" }],
  ],
  use: {
    baseURL: process.env.QA_STAGING_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
