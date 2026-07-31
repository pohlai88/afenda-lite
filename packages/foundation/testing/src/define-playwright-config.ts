/**
 * @afenda/testing
 * Contract: TESTING-CONTROL-PLANE
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { getTestingLane, type TestingLaneId } from "#testing/lanes";

export type DefineAfendaPlaywrightConfigOptions = Readonly<{
	lane: TestingLaneId;
}>;

export type AfendaPlaywrightLaneConfig = Readonly<{
	testDir: string;
	testMatch: readonly string[];
	timeout: number | undefined;
}>;

export function defineAfendaPlaywrightConfig(
	options: DefineAfendaPlaywrightConfigOptions,
): AfendaPlaywrightLaneConfig {
	const lane = getTestingLane(options.lane);

	if (lane.runner !== "playwright") {
		throw new Error(`Testing lane "${lane.id}" is not a Playwright lane.`);
	}

	return {
		testDir: ".",
		testMatch: lane.include,
		timeout: lane.timeoutMs,
	};
}
