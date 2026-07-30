import { getTestingLane } from "@afenda/testing/lanes";
import { defineAfendaPlaywrightConfig } from "@afenda/testing/playwright";
import { defineConfig, devices } from "@playwright/test";
import { loadPlaywrightEnv } from "./testing/e2e/env";

loadPlaywrightEnv();

const smokeLane = getTestingLane("e2e-smoke");
const journeyLane = getTestingLane("e2e-journey");
const allLane = getTestingLane("e2e-all");
const smokeConfig = defineAfendaPlaywrightConfig({ lane: "e2e-smoke" });
const journeyConfig = defineAfendaPlaywrightConfig({ lane: "e2e-journey" });
const allConfig = defineAfendaPlaywrightConfig({ lane: "e2e-all" });
const port = process.env.PLAYWRIGHT_PORT?.trim() || "3000";
const baseURL =
	process.env.PLAYWRIGHT_BASE_URL?.trim() || `http://localhost:${port}`;
const inheritedEnvironment = Object.fromEntries(
	Object.entries(process.env).filter(
		(entry): entry is [string, string] => entry[1] !== undefined,
	),
);

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
			name: smokeLane.id.replace("e2e-", ""),
			grep: /@smoke/,
			testDir: smokeConfig.testDir,
			testMatch: [...smokeConfig.testMatch],
			...(smokeConfig.timeout === undefined
				? {}
				: { timeout: smokeConfig.timeout }),
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: journeyLane.id.replace("e2e-", ""),
			grep: /@journey/,
			testDir: journeyConfig.testDir,
			testMatch: [...journeyConfig.testMatch],
			...(journeyConfig.timeout === undefined
				? {}
				: { timeout: journeyConfig.timeout }),
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: allLane.id.replace("e2e-", ""),
			testDir: allConfig.testDir,
			testMatch: [...allConfig.testMatch],
			...(allConfig.timeout === undefined
				? {}
				: { timeout: allConfig.timeout }),
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: `pnpm --filter @afenda/web exec next start --port ${port}`,
		url: baseURL,
		reuseExistingServer: Boolean(process.env.PLAYWRIGHT_REUSE_SERVER),
		timeout: 120_000,
		env: {
			...inheritedEnvironment,
			APP_URL: baseURL,
			PORT: port,
		},
	},
});
