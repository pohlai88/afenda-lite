/**
 * @afenda/testing
 * Contract: TESTING-CAPABILITY-POLICY
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import {
	APPROVED_DIRECT_DATABASE_URL_TEST_FILES,
	APPROVED_TESTING_CONFIG_FILES,
	FORBIDDEN_TEST_RUNNERS,
	getTestingLane,
	projectWorkspaceTestRun,
	TESTING_CONTROL_PLANE_HOME,
	TESTING_LANES,
	TESTING_POLICY_BOUND_CONFIG_FILES,
} from "#testing/lanes";

export const testingPolicy = Object.freeze({
	home: TESTING_CONTROL_PLANE_HOME,
	lanes: TESTING_LANES,
	configFiles: APPROVED_TESTING_CONFIG_FILES,
	policyBoundConfigFiles: TESTING_POLICY_BOUND_CONFIG_FILES,
	forbiddenRunners: FORBIDDEN_TEST_RUNNERS,
	approvedDirectDatabaseUrlTestFiles: APPROVED_DIRECT_DATABASE_URL_TEST_FILES,
	lane: getTestingLane,
	workspaceRun: projectWorkspaceTestRun,
});
