/**
 * @afenda/testing
 * Contract: TESTING-CAPABILITY-DATABASE
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import {
	hasE2eDatabaseUrl,
	requireE2eDatabaseUrl,
} from "#testing/e2e-database";
import { resolveDatabaseUrlForTests } from "#testing/require-database-for-ci";
import {
	setupDatabaseTestLane,
	setupRequiredDatabaseTestLane,
} from "#testing/setups/database";

export const testingDatabase = Object.freeze({
	resolve: resolveDatabaseUrlForTests,
	requireE2eUrl: requireE2eDatabaseUrl,
	hasE2eUrl: hasE2eDatabaseUrl,
	setup: setupDatabaseTestLane,
	setupRequired: setupRequiredDatabaseTestLane,
});
