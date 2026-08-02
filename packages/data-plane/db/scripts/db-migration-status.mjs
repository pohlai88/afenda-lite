/**
 * Read-only: compare Drizzle journal on disk vs drizzle.__drizzle_migrations on Neon.
 * Does not apply migrations or mutate the ledger.
 *
 * Authority: N2 · ARCH-028 S2.2
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

import { assertMigrationJournal } from "./lib/assert-migration-journal.mjs";
import { requireMigrationDatabaseUrl } from "./lib/database-url.mjs";
import {
	loadEnvLocal,
	loadMigrationJournalRows,
	reconcileMigrationJournalRows,
} from "./lib/migration-journal-rows.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "../../..");
const drizzleDir = join(root, "drizzle");

loadEnvLocal(repoRoot);

if (!existsSync(drizzleDir)) {
	console.error(
		"@afenda/db db:migration-status: missing packages/data-plane/db/drizzle/",
	);
	process.exit(1);
}

const journalAssert = assertMigrationJournal(drizzleDir);
if (!journalAssert.ok) {
	console.error("@afenda/db db:migration-status: journal assert FAILED:");
	for (const issue of journalAssert.issues) {
		console.error(`  - ${issue}`);
	}
	process.exit(1);
}

const journalRows = loadMigrationJournalRows(drizzleDir);

let databaseUrl;
try {
	databaseUrl = requireMigrationDatabaseUrl(process.env);
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`@afenda/db db:migration-status: ${message}`);
	process.exit(1);
}

const sql = neon(databaseUrl);

/** @type {Array<{ id: number | string, hash: string, created_at: string | number }>} */
let dbRows;
try {
	dbRows = await sql`
		SELECT id, hash, created_at
		FROM drizzle.__drizzle_migrations
		ORDER BY created_at ASC, id ASC
	`;
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(
		`@afenda/db db:migration-status: could not read drizzle.__drizzle_migrations: ${message}`,
	);
	process.exit(1);
}

const reconciliation = reconcileMigrationJournalRows(journalRows, dbRows);
const divergent = reconciliation.rows.filter(
	(row) => row.status === "hash mismatch" || row.status === "identity mismatch",
);
const { contiguousAppliedThroughTag, pendingCount, outOfOrderAppliedTags } =
	reconciliation.summary;
const details = process.argv.includes("--details");

console.log("@afenda/db db:migration-status:");
console.log(`  journal entries: ${journalRows.length}`);
console.log(`  db ledger rows:  ${dbRows.length}`);
console.log(
	`  contiguous applied through: ${contiguousAppliedThroughTag ?? "(none detected by hash+when)"}`,
);
console.log(`  pending forward: ${pendingCount}`);
console.log(`  applied beyond gap: ${outOfOrderAppliedTags.length}`);
console.log(
	`  unknown database rows: ${reconciliation.unknownDatabaseRows.length}`,
);
console.log(`  divergent identities: ${divergent.length}`);

if (details) {
	console.log("  identity comparison:");
	for (const row of [
		...reconciliation.rows,
		...reconciliation.unknownDatabaseRows,
	]) {
		console.log(
			JSON.stringify({
				journalId: row.journalId,
				journalFilename: row.journalFilename,
				expectedHash: row.expectedHash,
				ledgerId: row.ledgerId,
				appliedTimestamp: row.appliedTimestamp,
				appliedHash: row.appliedHash,
				status: row.status,
			}),
		);
	}
}

if (divergent.length > 0) {
	console.error("  drift:");
	for (const row of divergent) {
		console.error(`    - ${row.journalTag}: ${row.status}`);
	}
	process.exit(1);
}

if (reconciliation.unknownDatabaseRows.length > 0) {
	console.error(
		"  release status: FAIL — database ledger contains identities absent from the governed journal",
	);
	process.exit(1);
}

if (pendingCount > 0) {
	console.error(
		"  release status: FAIL — pending forward migrations must be applied",
	);
	console.error(
		"  action: AFENDA_ALLOW_DB_MIGRATE=1 pnpm --filter @afenda/db db:migrate",
	);
	console.error(
		"        if DDL is already on Neon, backfill ledger with AFENDA_ALLOW_DB_MIGRATE=1 pnpm --filter @afenda/db db:sync-migration-ledger",
	);
	process.exit(1);
}

console.log("  release status: PASS — no pending or divergent migration");
process.exit(0);
