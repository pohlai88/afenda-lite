import { defineConfig } from "drizzle-kit";

import { requireMigrationDatabaseUrl } from "./src/env";

/**
 * Drizzle Kit config (ARCH-025 · ARCH-028 S2.2 · N2).
 * Migrations write under packages/data-plane/db/drizzle/.
 * When DATABASE_URL is set, validate as inspection/operations class (PostgreSQL
 * URL; pooled or direct). Generate works without a URL. Guarded migration
 * execution separately requires a direct endpoint and is owned by the
 * identity-aware runner, not raw `drizzle-kit migrate`.
 */
function migrationCredentials(): { readonly url: string } | undefined {
	if (!process.env.DATABASE_URL) {
		return;
	}
	return { url: requireMigrationDatabaseUrl() };
}

const credentials = migrationCredentials();

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/schema/index.ts",
	out: "./drizzle",
	strict: true,
	verbose: true,
	...(credentials
		? {
				dbCredentials: credentials,
			}
		: {}),
});
