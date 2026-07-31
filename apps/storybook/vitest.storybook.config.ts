import { testingPolicy } from "@afenda/testing";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const lane = testingPolicy.lane("storybook-stories");

export default defineConfig({
	plugins: [storybookTest({ configDir: ".storybook" })],
	optimizeDeps: {
		include: [
			"@testing-library/dom",
			"@testing-library/jest-dom/vitest",
			"aria-query",
			"lz-string",
			"react/jsx-dev-runtime",
			"storybook/test",
		],
	},
	resolve: {
		dedupe: ["aria-query", "lz-string", "react", "react-dom"],
	},
	test: {
		name: lane.id,
		maxWorkers: 4,
		browser: {
			enabled: true,
			headless: true,
			provider: playwright(),
			instances: [{ browser: "chromium" }],
		},
	},
});
