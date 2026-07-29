import { getTestingLane } from "@afenda/testing";
import { defineConfig } from "vitest/config";

const lane = getTestingLane("storybook-unit");

export default defineConfig({
	test: {
		name: lane.id,
		include: ["__tests__/**/*.test.ts"],
		environment: "node",
	},
});
