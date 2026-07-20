import { defineConfig } from "drizzle-kit";

import { requireMigrationDatabaseUrl } from "./src/env";

/**
 * Drizzle Kit config (ARCH-025 · ARCH-028 S2.2 · N2).
 * Migrations write under packages/data-plane/db/drizzle/.
 * When DATABASE_URL is set, validate as migration-class (postgres URL; -pooler optional).
 * Generate works without URL; migrate/guard require URL separately.
 */
function migrationCredentials(): { url: string } | undefined {
	if (!process.env.DATABASE_URL) {
		return undefined;
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
