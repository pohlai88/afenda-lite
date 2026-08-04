// biome-ignore-all lint/style/noNestedTernary: Three-state Neon availability mapping remains visible at the boundary.
import { testingDatabase } from "@afenda/testing";

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
	const declaredTarget = process.env.AFENDA_DATABASE_TEST_TARGET;
	if (declaredTarget !== "test" && declaredTarget !== "preview") {
		throw new Error(
			"Corporate Administration Neon parity requires AFENDA_DATABASE_TEST_TARGET=test or preview.",
		);
	}

	for (const [name, value] of [
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

const resolvedDatabase = testingDatabase.resolve();
const databaseRequired = requiresDatabaseTests();

if (resolvedDatabase.hasDatabase && databaseRequired) {
	assertNotProductionDatabaseTarget();
}

export const CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON =
	databaseRequired && !resolvedDatabase.hasDatabase
		? "blocked: DATABASE_URL is required by CI or REQUIRE_DATABASE_TESTS"
		: databaseRequired
			? "running: DATABASE_URL resolved and Neon parity is required"
			: "skipped: set REQUIRE_DATABASE_TESTS=1 or run in CI to execute Neon parity";

export const RUN_CORPORATE_ADMINISTRATION_NEON_PARITY =
	resolvedDatabase.hasDatabase && databaseRequired;
