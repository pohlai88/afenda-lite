/**
 * Fail-fast DATABASE_URL helpers for `@afenda/db`.
 * ARCH-024 forbids `db → @afenda/env`; Next loads `.env.local` into process.env.
 * Product code validates config via `import { env } from '@afenda/env'`.
 *
 * Consumer classes (N2 · ARCH-023 · ARCH-025):
 * - Product runtime: Neon `-pooler` required
 * - Migration/ops: same `DATABASE_URL` key; postgres URL required; `-pooler` not required
 *   (operator may shell-override to an unpooled endpoint — no separate DIRECT_* env key)
 */

function readDatabaseUrl(): string {
	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error("@afenda/db: DATABASE_URL is required");
	}
	return url;
}

function assertPostgresUrl(url: string, classLabel: string): URL {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw new Error(
			`@afenda/db: DATABASE_URL must be a valid URL (${classLabel})`,
		);
	}
	if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
		throw new Error(
			`@afenda/db: DATABASE_URL must be a postgres URL (${classLabel})`,
		);
	}
	return parsed;
}

/** Product client — Neon `-pooler` host required (ARCH-023). */
export function requireProductDatabaseUrl(): string {
	const url = readDatabaseUrl();
	const parsed = assertPostgresUrl(url, "product");
	if (!parsed.hostname.includes("-pooler")) {
		throw new Error(
			"@afenda/db: DATABASE_URL must use Neon -pooler host for the product client (ARCH-023)",
		);
	}
	return url;
}

/**
 * Migration / drizzle-kit / ops — valid postgres URL; `-pooler` not required.
 * Uses the same `DATABASE_URL` key (no DIRECT_* product var).
 */
export function requireMigrationDatabaseUrl(): string {
	const url = readDatabaseUrl();
	assertPostgresUrl(url, "migration");
	return url;
}

/** Product-compatible alias — prefer `requireProductDatabaseUrl` in new code. */
export function requireDatabaseUrl(): string {
	return requireProductDatabaseUrl();
}
