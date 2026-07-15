import { defineConfig, devices } from "@playwright/test";
import { loadPlaywrightEnv } from "./testing/e2e/env";

loadPlaywrightEnv();

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

const sharedUse = {
  baseURL,
  trace: "on-first-retry" as const,
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: sharedUse,
  projects: [
    {
      name: "smoke",
      grep: /@smoke/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "journey",
      grep: /@journey/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "all",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm --filter @afenda/web start",
    url: baseURL,
    reuseExistingServer: Boolean(process.env.PLAYWRIGHT_REUSE_SERVER),
    timeout: 120_000,
    env: {
      ...process.env,
      APP_URL: baseURL,
    },
  },
});
