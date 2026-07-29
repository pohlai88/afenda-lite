/**
 * @afenda/testing
 * Contract: TESTING-CONTROL-PLANE
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { resolveDatabaseUrlForTests } from "./require-database-for-ci.ts";

export function requireE2eDatabaseUrl(): string {
	const { databaseUrl } = resolveDatabaseUrlForTests();

	if (!databaseUrl) {
		throw new Error("E2E factory requires DATABASE_URL");
	}

	return databaseUrl;
}

export function hasE2eDatabaseUrl(): boolean {
	return resolveDatabaseUrlForTests().hasDatabase;
}
