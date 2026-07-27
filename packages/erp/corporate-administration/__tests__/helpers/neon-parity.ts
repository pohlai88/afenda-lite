import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";

function truthy(value: string | undefined): boolean {
	return value === "1" || value === "true";
}

function isCiEnvironment(): boolean {
	return truthy(process.env.CI);
}

function requiresDatabaseTests(): boolean {
	return isCiEnvironment() || truthy(process.env.REQUIRE_DATABASE_TESTS);
}

function assertNotProductionDatabaseTarget(): void {
	for (const [name, value] of [
		["AFENDA_DATABASE_TEST_TARGET", process.env.AFENDA_DATABASE_TEST_TARGET],
		["VERCEL_ENV", process.env.VERCEL_ENV],
		["NODE_ENV", process.env.NODE_ENV],
	] as const) {
		if (value === "production") {
			throw new Error(
				`Corporate Administration Neon parity must not target production (${name}=production).`,
			);
		}
	}
}

const resolvedDatabase = resolveDatabaseUrlForTests();
const databaseRequired = requiresDatabaseTests();

if (resolvedDatabase.hasDatabase && databaseRequired) {
	assertNotProductionDatabaseTarget();
}

export const CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON =
	databaseRequired && !resolvedDatabase.hasDatabase
		? "blocked: DATABASE_URL is required by CI or REQUIRE_DATABASE_TESTS"
		: !databaseRequired
			? "skipped: set REQUIRE_DATABASE_TESTS=1 or run in CI to execute Neon parity"
			: "running: DATABASE_URL resolved and Neon parity is required";

export const RUN_CORPORATE_ADMINISTRATION_NEON_PARITY =
	resolvedDatabase.hasDatabase && databaseRequired;
