import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LINE_BREAK_PATTERN = /\r?\n/;
const ENV_ASSIGNMENT_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;

/**
 * @param {string} drizzleDir
 */
export function loadMigrationJournalRows(drizzleDir) {
	/** @type {{ entries: Array<{ idx: number, tag: string, when: number }> }} */
	const journal = JSON.parse(
		readFileSync(join(drizzleDir, "meta", "_journal.json"), "utf8"),
	);

	return journal.entries.map((entry) => {
		const sql = readFileSync(join(drizzleDir, `${entry.tag}.sql`), "utf8");
		return {
			idx: entry.idx,
			tag: entry.tag,
			when: entry.when,
			hash: crypto.createHash("sha256").update(sql).digest("hex"),
		};
	});
}

/**
 * @param {Array<{ idx: number, tag: string, when: number, hash: string }>} journalRows
 * @param {Array<{ hash: string, created_at: string | number }>} dbRows
 */
export function findPendingMigrationJournalRows(journalRows, dbRows) {
	const dbByCreatedAt = new Map(
		dbRows.map((row) => [Number(row.created_at), String(row.hash)]),
	);
	const dbHashes = new Set(dbRows.map((row) => String(row.hash)));

	/** @type {Array<{ idx: number, tag: string, when: number, hash: string, kind: "missing" | "created_at_mismatch" }>} */
	const pending = [];
	/** @type {string[]} */
	const driftIssues = [];

	for (const row of journalRows) {
		const dbHash = dbByCreatedAt.get(row.when);
		if (dbHash === row.hash) {
			continue;
		}
		if (dbHashes.has(row.hash)) {
			driftIssues.push(
				`hash present in DB but created_at mismatch for ${row.tag} (journal when=${row.when})`,
			);
			pending.push({ ...row, kind: "created_at_mismatch" });
			continue;
		}
		pending.push({ ...row, kind: "missing" });
	}

	return { pending, driftIssues };
}

/**
 * Identity-level comparison of the governed journal and the Drizzle ledger.
 * Drizzle stores no migration tag; journal `when` maps to ledger `created_at`,
 * and the SQL file SHA-256 must match the ledger hash.
 *
 * @param {Array<{ idx: number, tag: string, when: number, hash: string }>} journalRows
 * @param {Array<{ id?: number | string, hash: string, created_at: string | number }>} dbRows
 */
export function reconcileMigrationJournalRows(journalRows, dbRows) {
	const consumedLedgerRows = new Set();
	const rows = journalRows.map((journal) => {
		const timestampIndex = dbRows.findIndex(
			(dbRow) => Number(dbRow.created_at) === journal.when,
		);
		if (timestampIndex >= 0) {
			consumedLedgerRows.add(timestampIndex);
			const ledger = dbRows[timestampIndex];
			return {
				journalId: journal.idx,
				journalTag: journal.tag,
				journalFilename: `${journal.tag}.sql`,
				expectedHash: journal.hash,
				ledgerId: ledger?.id ?? null,
				appliedTimestamp: Number(ledger?.created_at),
				appliedHash: String(ledger?.hash),
				status:
					String(ledger?.hash) === journal.hash ? "applied" : "hash mismatch",
			};
		}

		const hashIndex = dbRows.findIndex(
			(dbRow, index) =>
				!consumedLedgerRows.has(index) && String(dbRow.hash) === journal.hash,
		);
		if (hashIndex >= 0) {
			consumedLedgerRows.add(hashIndex);
			const ledger = dbRows[hashIndex];
			return {
				journalId: journal.idx,
				journalTag: journal.tag,
				journalFilename: `${journal.tag}.sql`,
				expectedHash: journal.hash,
				ledgerId: ledger?.id ?? null,
				appliedTimestamp: Number(ledger?.created_at),
				appliedHash: String(ledger?.hash),
				status: "identity mismatch",
			};
		}

		return {
			journalId: journal.idx,
			journalTag: journal.tag,
			journalFilename: `${journal.tag}.sql`,
			expectedHash: journal.hash,
			ledgerId: null,
			appliedTimestamp: null,
			appliedHash: null,
			status: "pending",
		};
	});

	const unknownDatabaseRows = dbRows
		.map((ledger, index) => ({ ledger, index }))
		.filter(({ index }) => !consumedLedgerRows.has(index))
		.map(({ ledger }) => ({
			journalId: null,
			journalTag: null,
			journalFilename: null,
			expectedHash: null,
			ledgerId: ledger.id ?? null,
			appliedTimestamp: Number(ledger.created_at),
			appliedHash: String(ledger.hash),
			status: "unknown in database",
		}));

	return { rows, unknownDatabaseRows };
}

/**
 * @param {string} repoRoot
 */
export function loadEnvLocal(repoRoot) {
	if (process.env.DATABASE_URL) {
		return;
	}
	const envPath = join(repoRoot, ".env.local");
	if (!existsSync(envPath)) {
		return;
	}
	const text = readFileSync(envPath, "utf8");
	for (const line of text.split(LINE_BREAK_PATTERN)) {
		const trimmed = line.trim();
		if (trimmed.length === 0 || trimmed.startsWith("#")) {
			continue;
		}
		const match = ENV_ASSIGNMENT_PATTERN.exec(trimmed);
		if (!match) {
			continue;
		}
		const [, key, rawValue] = match;
		let value = rawValue?.trim() ?? "";
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (process.env[key] === undefined) {
			process.env[key] = value;
		}
	}
}
