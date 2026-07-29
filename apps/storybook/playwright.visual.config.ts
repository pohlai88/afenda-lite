import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	testDir: "./visual-tests",
	testMatch: "**/*.visual.spec.ts",
	fullyParallel: false,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	updateSnapshots: "none",
	reporter: process.env.CI
		? [
				["github"],
				["html", { open: "never", outputFolder: "playwright-report" }],
			]
		: [
				["list"],
				["html", { open: "on-failure", outputFolder: "playwright-report" }],
			],
	use: {
		baseURL: "http://127.0.0.1:6007",
		locale: "en-US",
		timezoneId: "UTC",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	expect: {
		toHaveScreenshot: {
			animations: "disabled",
			caret: "hide",
			stylePath: path.join(configDirectory, "visual-tests/screenshot.css"),
			threshold: 0.1,
			maxDiffPixelRatio: 0.001,
		},
	},
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				viewport: { width: 1440, height: 900 },
			},
		},
	],
	webServer: {
		command: "pnpm preview --host 127.0.0.1",
		url: "http://127.0.0.1:6007/index.json",
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
		stdout: "pipe",
		stderr: "pipe",
	},
	snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
});
