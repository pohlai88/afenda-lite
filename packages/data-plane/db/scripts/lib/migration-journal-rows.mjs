import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
	for (const line of text.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
		const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
		if (!match) continue;
		const key = match[1];
		let value = match[2]?.trim() ?? "";
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
