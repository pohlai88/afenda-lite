import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runNeonHttpTransaction } from "@afenda/db";

const migrationPath = join(
	dirname(fileURLToPath(import.meta.url)),
	"../fixtures/hr-performance-schema.sql",
);

const migrationHash = createHash("sha256")
	.update(readFileSync(migrationPath))
	.digest("hex");

const migrationStatements = readFileSync(migrationPath, "utf8")
	.split(/--> statement-breakpoint\n/)
	.map((statement) => statement.trim())
	.filter((statement) => statement.length > 0);

let ensured = false;

/** Apply HR performance DDL when Drizzle parity runs against a DB missing performance tables. */
export async function ensurePerformanceSchemaForTests(): Promise<void> {
	if (ensured) {
		return;
	}

	const [exists] = await runNeonHttpTransaction<[{ exists: boolean }[]]>((sql) => [
		sql`
			SELECT EXISTS (
				SELECT 1
				FROM information_schema.tables
				WHERE table_schema = 'public'
					AND table_name = 'hr_performance_cycle'
			) AS exists
		`,
	]);
	if (exists[0]?.exists) {
		ensured = true;
		return;
	}

	await runNeonHttpTransaction((sql) => [
		...migrationStatements.map((statement) => sql.unsafe(statement)),
	]);

	await runNeonHttpTransaction((sql) => [
		sql`
			INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
			SELECT ${migrationHash}, ${1784900000000}
			WHERE NOT EXISTS (
				SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = ${migrationHash}
			)
		`,
	]);

	ensured = true;
}
