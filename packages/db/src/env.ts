/**
 * Fail-fast DATABASE_URL for `@afenda/db`.
 * ARCH-024 forbids `db → @afenda/env`; Next loads `.env.local` into process.env.
 * Product code validates config via `import { env } from '@afenda/env'`.
 */
export function requireDatabaseUrl(): string {
	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error("@afenda/db: DATABASE_URL is required");
	}
	return url;
}
