import { readFileSync } from "node:fs";
import { join } from "node:path";

import pg from "pg";

import { requireDirectMigrationDatabaseUrl } from "./database-url.mjs";
import { getHistoricalReconciliationDisposition } from "./historical-migration-execution.mjs";
import {
	loadMigrationJournalRows,
	reconcileMigrationJournalRows,
} from "./migration-journal-rows.mjs";

const { Client } = pg;
const STATEMENT_BREAKPOINT = "--> statement-breakpoint";

/**
 * Plan migrations by exact journal identity instead of Drizzle's greatest-
 * timestamp cutoff. Any unknown or divergent ledger identity fails closed.
 *
 * @param {Array<{ idx: number, tag: string, when: number, hash: string }>} journalRows
 * @param {Array<{ id?: number | string, hash: string, created_at: string | number }>} ledgerRows
 */
export function planIdentityMigrations(journalRows, ledgerRows) {
	const reconciliation = reconcileMigrationJournalRows(journalRows, ledgerRows);
	const divergent = reconciliation.rows.filter(
		(row) =>
			row.status === "hash mismatch" || row.status === "identity mismatch",
	);
	if (divergent.length > 0) {
		throw new Error(
			`Migration ledger divergence: ${divergent
				.map((row) => `${row.journalTag} (${row.status})`)
				.join(", ")}`,
		);
	}
	if (reconciliation.unknownDatabaseRows.length > 0) {
		throw new Error(
			`Unknown database migration identities: ${reconciliation.unknownDatabaseRows
				.map((row) => `${row.ledgerId}@${row.appliedTimestamp}`)
				.join(", ")}`,
		);
	}

	const pendingTags = new Set(
		reconciliation.rows
			.filter((row) => row.status === "pending")
			.map((row) => row.journalTag),
	);
	return journalRows.filter((row) => pendingTags.has(row.tag));
}

/**
 * Apply every missing governed identity in journal order within one PostgreSQL
 * transaction. The transaction-level advisory lock serializes Afenda migration
 * writers; the ledger is reread only after the lock is acquired.
 *
 * @param {{ databaseUrl: string, drizzleDir: string, log?: (message: string) => void }} input
 */
export async function applyIdentityMigrations(input) {
	const log = input.log ?? console.log;
	const databaseUrl = requireDirectMigrationDatabaseUrl({
		DATABASE_URL: input.databaseUrl,
	});
	const journalRows = loadMigrationJournalRows(input.drizzleDir);
	const client = new Client({ connectionString: databaseUrl });

	await client.connect();
	try {
		await client.query("BEGIN");
		await client.query("SELECT pg_advisory_xact_lock($1, $2)", [947_219, 41]);
		await client.query('CREATE SCHEMA IF NOT EXISTS "drizzle"');
		await client.query(`
			CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at bigint
			)
		`);
		const ledgerResult = await client.query(
			'SELECT id, hash, created_at FROM "drizzle"."__drizzle_migrations" ORDER BY created_at ASC, id ASC',
		);
		const pending = planIdentityMigrations(journalRows, ledgerResult.rows);
		const appliedTags = new Set(
			reconcileMigrationJournalRows(journalRows, ledgerResult.rows)
				.rows.filter((row) => row.status === "applied")
				.map((row) => row.journalTag),
		);

		for (const migration of pending) {
			const reconciliation = getHistoricalReconciliationDisposition(
				migration,
				appliedTags,
			);
			if (reconciliation) {
				log(
					`@afenda/db db:migrate: recording ${migration.tag} as ${reconciliation.status}; repair SQL is non-applicable to linear history`,
				);
			} else {
				log(`@afenda/db db:migrate: applying ${migration.tag}`);
				const sql = readFileSync(
					join(input.drizzleDir, `${migration.tag}.sql`),
					"utf8",
				);
				for (const statement of sql.split(STATEMENT_BREAKPOINT)) {
					if (statement.trim().length > 0) {
						// biome-ignore lint/performance/noAwaitInLoops: migration statements are ordered and must execute serially
						await client.query(statement);
					}
				}
			}
			await client.query(
				'INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)',
				[migration.hash, migration.when],
			);
			appliedTags.add(migration.tag);
		}

		await client.query("COMMIT");
		if (pending.length === 0) {
			log("@afenda/db db:migrate: no-op — all governed identities are applied");
		} else {
			log(
				`@afenda/db db:migrate: committed ${pending.length} migration${pending.length === 1 ? "" : "s"}`,
			);
		}
		return { applied: pending.map((migration) => migration.tag) };
	} catch (error) {
		await client.query("ROLLBACK").catch(() => undefined);
		throw error;
	} finally {
		await client.end();
	}
}
