import { defineConfig, devices } from "@playwright/test";

/**
 * Request-cost journeys against a deployed staging app. Each journey writes
 * what the browser fetched to e2e/.cost/; `pnpm cost:report` joins that with
 * the Worker's `request_cost` log lines. See docs/request-cost.md.
 */
export default defineConfig({
  testDir: "./e2e/cost",
  globalSetup: "./e2e/staging/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 120_000,
  reporter: [["list"]],
  use: {
    baseURL: process.env.QA_STAGING_URL,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
