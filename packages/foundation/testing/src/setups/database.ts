/**
 * @afenda/testing
 * Contract: TESTING-CONTROL-PLANE
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { resolveDatabaseUrlForTests } from "../require-database-for-ci.ts";

export function setupDatabaseTestLane(): void {
	resolveDatabaseUrlForTests();
}

export function setupRequiredDatabaseTestLane(): void {
	process.env.REQUIRE_DATABASE_TESTS = "1";
	resolveDatabaseUrlForTests();
}
