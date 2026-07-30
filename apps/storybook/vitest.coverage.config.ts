import { getTestingLane } from "@afenda/testing";
import { defineConfig } from "vitest/config";

const lane = getTestingLane("storybook-unit");
const hookTimeout = lane.hookTimeoutMs ?? lane.timeoutMs;

export default defineConfig({
	test: {
		name: lane.id,
		include: ["__tests__/**/*.test.ts"],
		environment: "node",
		...(lane.timeoutMs === undefined ? {} : { testTimeout: lane.timeoutMs }),
		...(hookTimeout === undefined ? {} : { hookTimeout }),
	},
});
