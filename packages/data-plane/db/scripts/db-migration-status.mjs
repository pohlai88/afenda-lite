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
	findPendingMigrationJournalRows,
	loadEnvLocal,
	loadMigrationJournalRows,
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

/** @type {Array<{ hash: string, created_at: string | number }>} */
let dbRows;
try {
	dbRows = await sql`
		SELECT hash, created_at
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

let appliedThroughTag = null;
for (const row of journalRows) {
	const dbHash = dbRows.find(
		(dbRow) => Number(dbRow.created_at) === row.when,
	)?.hash;
	if (String(dbHash) === row.hash) {
		appliedThroughTag = row.tag;
	}
}

const { pending, driftIssues: issues } = findPendingMigrationJournalRows(
	journalRows,
	dbRows,
);
const pendingCount = pending.length;

console.log("@afenda/db db:migration-status:");
console.log(`  journal entries: ${journalRows.length}`);
console.log(`  db ledger rows:  ${dbRows.length}`);
console.log(
	`  applied through:   ${appliedThroughTag ?? "(none detected by hash+when)"}`,
);
console.log(`  pending forward: ${pendingCount}`);

if (issues.length > 0) {
	console.error("  drift:");
	for (const issue of issues) {
		console.error(`    - ${issue}`);
	}
	process.exit(1);
}

if (pendingCount > 0) {
	console.log(
		"  note: pending forward may need AFENDA_ALLOW_DB_MIGRATE=1 pnpm db:migrate",
	);
	console.log(
		"        if DDL is already on Neon, backfill ledger with AFENDA_ALLOW_DB_MIGRATE=1 pnpm db:sync-migration-ledger",
	);
}

process.exit(0);
