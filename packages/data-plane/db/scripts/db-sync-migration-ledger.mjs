/**
 * Operator tool: backfill drizzle.__drizzle_migrations when journal SQL is already on Neon.
 *
 * Use when db:migration-status reports pending forward but DDL probes show the migration
 * was applied outside the Drizzle ledger (or ledger insert failed).
 *
 * Requires AFENDA_ALLOW_DB_MIGRATE=1 — same operator gate as db:migrate.
 *
 * Usage:
 *   AFENDA_ALLOW_DB_MIGRATE=1 pnpm --filter @afenda/db db:sync-migration-ledger
 *   AFENDA_ALLOW_DB_MIGRATE=1 pnpm --filter @afenda/db db:sync-migration-ledger -- 0017_hr_candidate_consent
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

import { assertMigrationJournal } from "./lib/assert-migration-journal.mjs";
import { requireMigrationDatabaseUrl } from "./lib/database-url.mjs";
import { probeMigrationDdlApplied } from "./lib/migration-ddl-probes.mjs";
import {
	findPendingMigrationJournalRows,
	loadEnvLocal,
	loadMigrationJournalRows,
} from "./lib/migration-journal-rows.mjs";
import { runSequentially } from "./lib/run-sequentially.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "../../..");
const drizzleDir = join(root, "drizzle");

loadEnvLocal(repoRoot);

if (process.env.AFENDA_ALLOW_DB_MIGRATE !== "1") {
	console.error(`
@afenda/db db:sync-migration-ledger DENIED

Ledger backfill mutates drizzle.__drizzle_migrations — operator gate required:
  AFENDA_ALLOW_DB_MIGRATE=1 pnpm --filter @afenda/db db:sync-migration-ledger
`);
	process.exit(1);
}

if (!existsSync(drizzleDir)) {
	console.error(
		"@afenda/db db:sync-migration-ledger: missing packages/data-plane/db/drizzle/",
	);
	process.exit(1);
}

const journalAssert = assertMigrationJournal(drizzleDir);
if (!journalAssert.ok) {
	console.error("@afenda/db db:sync-migration-ledger: journal assert FAILED:");
	for (const issue of journalAssert.issues) {
		console.error(`  - ${issue}`);
	}
	process.exit(1);
}

const requestedTags = process.argv.slice(2).filter(Boolean);
const journalRows = loadMigrationJournalRows(drizzleDir);

let databaseUrl;
try {
	databaseUrl = requireMigrationDatabaseUrl(process.env);
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`@afenda/db db:sync-migration-ledger: ${message}`);
	process.exit(1);
}

const sql = neon(databaseUrl);

/** @type {Array<{ hash: string, created_at: string | number }>} */
const dbRows = await sql`
	SELECT hash, created_at
	FROM drizzle.__drizzle_migrations
	ORDER BY created_at ASC, id ASC
`;

const { pending, driftIssues } = findPendingMigrationJournalRows(
	journalRows,
	dbRows,
);

if (driftIssues.length > 0) {
	console.error("@afenda/db db:sync-migration-ledger: ledger drift detected:");
	for (const issue of driftIssues) {
		console.error(`  - ${issue}`);
	}
	console.error(
		"  Fix created_at/hash drift manually before backfill — this tool only inserts missing ledger rows.",
	);
	process.exit(1);
}

const targets =
	requestedTags.length > 0
		? pending.filter((row) => requestedTags.includes(row.tag))
		: pending;

if (requestedTags.length > 0) {
	const unknown = requestedTags.filter(
		(tag) => !journalRows.some((row) => row.tag === tag),
	);
	if (unknown.length > 0) {
		console.error(
			`@afenda/db db:sync-migration-ledger: unknown journal tag(s): ${unknown.join(", ")}`,
		);
		process.exit(1);
	}
	const notPending = requestedTags.filter(
		(tag) => !pending.some((row) => row.tag === tag),
	);
	if (notPending.length > 0) {
		console.log(
			`@afenda/db db:sync-migration-ledger: already journaled (skip): ${notPending.join(", ")}`,
		);
	}
}

if (targets.length === 0) {
	console.log(
		"@afenda/db db:sync-migration-ledger: no pending ledger backfill targets",
	);
	process.exit(0);
}

await runSequentially(targets, async (row) => {
	const probe = await probeMigrationDdlApplied(sql, row.tag);
	if (probe === null) {
		console.error(
			`@afenda/db db:sync-migration-ledger: no DDL probe for ${row.tag} — use db:migrate instead`,
		);
		process.exit(1);
	}
	if (!probe) {
		console.error(
			`@afenda/db db:sync-migration-ledger: ${row.tag} DDL not present — use db:migrate instead`,
		);
		process.exit(1);
	}

	const existing = await sql`
		SELECT hash FROM drizzle.__drizzle_migrations WHERE hash = ${row.hash}
	`;
	if (existing.length > 0) {
		console.log(
			`@afenda/db db:sync-migration-ledger: ${row.tag} already journaled`,
		);
		return;
	}

	await sql`
		INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
		VALUES (${row.hash}, ${String(row.when)})
	`;
	console.log(
		`@afenda/db db:sync-migration-ledger: recorded ${row.tag} in drizzle.__drizzle_migrations`,
	);
});
