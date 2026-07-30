/**
 * Fail-fast DATABASE_URL helpers for `@afenda/db`.
 * ARCH-024 forbids `db → @afenda/env`; Next loads `.env.local` into process.env.
 * Product code validates config via `import { env } from '@afenda/env'`.
 *
 * Connection classes (N2 · ARCH-023 · ARCH-025):
 * - Product runtime: Neon pooled endpoint required.
 * - Drizzle Kit / inspection operations: PostgreSQL endpoint required; pooled
 *   or direct accepted.
 * - Guarded migration execution: direct endpoint required; pooled prohibited.
 *
 * All classes use `DATABASE_URL`. Operators may override it in the migration
 * process environment; this package does not own a separate DIRECT_* key.
 */

const DATABASE_URL_KEY = "DATABASE_URL";

type ParsedDatabaseUrl = Readonly<{
	raw: string;
	parsed: URL;
}>;

function readDatabaseUrl(): string {
	const value = process.env[DATABASE_URL_KEY]?.trim();
	if (!value) {
		throw new Error("@afenda/db: DATABASE_URL is required");
	}
	return value;
}

function parsePostgresUrl(classLabel: string): ParsedDatabaseUrl {
	const raw = readDatabaseUrl();
	let parsed: URL;
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

function isPoolerHost(hostname: string): boolean {
	const [firstLabel] = hostname.toLowerCase().split(".");
	return firstLabel?.endsWith("-pooler") === true;
}

/** Product client — Neon `-pooler` host required (ARCH-023). */
export function requireProductDatabaseUrl(): string {
	const { raw, parsed } = parsePostgresUrl("product");
	if (!isPoolerHost(parsed.hostname)) {
		throw new Error(
			"@afenda/db: DATABASE_URL must use a Neon -pooler host for the product client (ARCH-023)",
		);
	}
	return raw;
}

/**
 * Migration / drizzle-kit / ops — valid postgres URL; `-pooler` not required.
 * Uses the same `DATABASE_URL` key (no DIRECT_* product var).
 */
export function requireMigrationDatabaseUrl(): string {
	return parsePostgresUrl("migration/ops").raw;
}

/** Guarded migration execution — direct endpoint required. */
export function requireDirectMigrationDatabaseUrl(): string {
	const { raw, parsed } = parsePostgresUrl("direct migration");
	if (isPoolerHost(parsed.hostname)) {
		throw new Error(
			"@afenda/db: guarded migration execution requires a direct DATABASE_URL; Neon -pooler hosts are prohibited",
		);
	}
	return raw;
}
