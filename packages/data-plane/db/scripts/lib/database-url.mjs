/**
 * Migration-class DATABASE_URL resolver for Node scripts (N2).
 * Mirrors packages/data-plane/db/src/env.ts requireMigrationDatabaseUrl — no DIRECT_* key.
 */

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function requireMigrationDatabaseUrl(env = process.env) {
	const url = env.DATABASE_URL;
	if (!url) {
		throw new Error("@afenda/db: DATABASE_URL is required (migration)");
	}
	let parsed;
	try {
		parsed = new URL(url);
	} catch {
		throw new Error("@afenda/db: DATABASE_URL must be a valid URL (migration)");
	}
	if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
		throw new Error(
			"@afenda/db: DATABASE_URL must be a postgres URL (migration)",
		);
	}
	return url;
}
