/**
 * @afenda/testing
 * Contract: TESTING-CONTROL-PLANE
 * Protected: changes require local pre-edit token and compatibility checks.
 */

export { testingDatabase } from "#testing/capabilities/database";
export { testingPlaywright } from "#testing/capabilities/playwright";
export { testingPolicy } from "#testing/capabilities/policy";
export { testingVitest } from "#testing/capabilities/vitest";
export type {
	TestingCacheClass,
	TestingRunner,
} from "#testing/contracts";
export type { TestingLane, TestingLaneId } from "#testing/lanes";
export type {
	DatabaseForTests,
	DatabaseUrlSource,
	ResolveDatabaseUrlOptions,
} from "#testing/require-database-for-ci";
