/**
 * @afenda/testing
 * Contract: TESTING-CONTROL-PLANE
 * Protected: changes require local pre-edit token and compatibility checks.
 */

export type {
	TestingCacheClass,
	TestingLane,
	TestingLaneId,
	TestingRunner,
} from "./contracts.ts";
export {
	type AfendaPlaywrightLaneConfig,
	type DefineAfendaPlaywrightConfigOptions,
	defineAfendaPlaywrightConfig,
} from "./define-playwright-config.ts";
export {
	type DefineAfendaVitestConfigOptions,
	defineAfendaVitestConfig,
	type ResolveVitestLanePatternsOptions,
	resolveVitestLaneExclude,
	resolveVitestLaneInclude,
} from "./define-vitest-config.ts";
export {
	hasE2eDatabaseUrl,
	requireE2eDatabaseUrl,
} from "./e2e-database.ts";
export {
	APPROVED_DIRECT_DATABASE_URL_TEST_FILES,
	APPROVED_TESTING_CONFIG_FILES,
	FORBIDDEN_TEST_RUNNERS,
	getTestingLane,
	TESTING_CONTROL_PLANE_HOME,
	TESTING_LANES,
	TESTING_POLICY_BOUND_CONFIG_FILES,
} from "./lanes.ts";
export {
	type DatabaseForTests,
	type DatabaseUrlSource,
	type ResolveDatabaseUrlOptions,
	resolveDatabaseUrlForTests,
} from "./require-database-for-ci.ts";
export {
	setupDatabaseTestLane,
	setupRequiredDatabaseTestLane,
} from "./setups/database.ts";
