import { resolveDatabaseUrlForTests } from "../../../../foundation/testing/src/require-database-for-ci.ts";

const resolved = resolveDatabaseUrlForTests();

export const hasDatabase = resolved.hasDatabase;

function requireDatabaseMode(): boolean {
	const ci = process.env.CI;
	const requireFlag = process.env.REQUIRE_DATABASE_TESTS;
	return (
		ci === "true" || ci === "1" || requireFlag === "1" || requireFlag === "true"
	);
}

export const runDrizzleParity = hasDatabase && requireDatabaseMode();
