/**
 * DATABASE_URL connection-class resolvers for Node migration/operations scripts.
 * Mirrors packages/data-plane/db/src/env.ts without introducing a DIRECT_* key.
 */

/** @param {string} hostname */
function isPoolerHost(hostname) {
	const [firstLabel] = hostname.toLowerCase().split(".");
	return firstLabel?.endsWith("-pooler") === true;
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {string} classLabel
 * @returns {{ raw: string, parsed: URL }}
 */
function parsePostgresUrl(env, classLabel) {
	const raw = env.DATABASE_URL?.trim();
	if (!raw) {
		throw new Error(`@afenda/db: DATABASE_URL is required (${classLabel})`);
	}

	let parsed;
	try {
		parsed = new URL(raw);
	} catch (error) {
		throw new Error(
			`@afenda/db: DATABASE_URL must be a valid URL (${classLabel})`,
			{ cause: error },
		);
	}
	if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
		throw new Error(
			`@afenda/db: DATABASE_URL must use the postgres or postgresql protocol (${classLabel})`,
		);
	}
	if (!parsed.hostname) {
		throw new Error(
			`@afenda/db: DATABASE_URL must include a hostname (${classLabel})`,
		);
	}
	return { raw, parsed };
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function requireMigrationDatabaseUrl(env = process.env) {
	return parsePostgresUrl(env, "migration/ops").raw;
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function requireDirectMigrationDatabaseUrl(env = process.env) {
	const { raw, parsed } = parsePostgresUrl(env, "direct migration");
	if (isPoolerHost(parsed.hostname)) {
		throw new Error(
			"@afenda/db: guarded migration execution requires a direct DATABASE_URL; Neon -pooler hosts are prohibited",
		);
	}
	return raw;
}
