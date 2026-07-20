/**
 * Journal ↔ SQL file integrity for packages/data-plane/db/drizzle (N2).
 * Checks: duplicate tags, duplicate idx, non-monotonic idx order,
 * missing SQL for journal tags, orphan SQL files.
 * Does not require gapless idx sequences (Drizzle may leave gaps).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * @typedef {{ idx: number, tag: string }} JournalEntry
 * @typedef {{ ok: boolean, issues: string[] }} JournalAssertResult
 */

/**
 * @param {string} drizzleDir absolute path to packages/data-plane/db/drizzle
 * @returns {JournalAssertResult}
 */
export function assertMigrationJournal(drizzleDir) {
	const issues = [];
	const journalPath = join(drizzleDir, "meta", "_journal.json");

	if (!existsSync(journalPath)) {
		return {
			ok: false,
			issues: [`missing journal: ${journalPath}`],
		};
	}

	/** @type {{ entries?: JournalEntry[] }} */
	let journal;
	try {
		journal = JSON.parse(readFileSync(journalPath, "utf8"));
	} catch {
		return { ok: false, issues: ["journal is not valid JSON"] };
	}

	const entries = Array.isArray(journal.entries) ? journal.entries : null;
	if (!entries) {
		return { ok: false, issues: ["journal.entries must be an array"] };
	}

	const tags = new Set();
	const idxs = new Set();
	let prevIdx = Number.NEGATIVE_INFINITY;

	for (const entry of entries) {
		if (
			typeof entry?.tag !== "string" ||
			entry.tag.length === 0 ||
			typeof entry?.idx !== "number" ||
			!Number.isInteger(entry.idx)
		) {
			issues.push(
				`invalid journal entry: tag=${String(entry?.tag)} idx=${String(entry?.idx)}`,
			);
			continue;
		}

		if (tags.has(entry.tag)) {
			issues.push(`duplicate journal tag: ${entry.tag}`);
		}
		tags.add(entry.tag);

		if (idxs.has(entry.idx)) {
			issues.push(`duplicate journal idx: ${entry.idx}`);
		}
		idxs.add(entry.idx);

		if (entry.idx < prevIdx) {
			issues.push(
				`journal idx out of order: ${entry.idx} after ${prevIdx} (tag ${entry.tag})`,
			);
		}
		prevIdx = entry.idx;

		const sqlPath = join(drizzleDir, `${entry.tag}.sql`);
		if (!existsSync(sqlPath)) {
			issues.push(`missing SQL for journal tag: ${entry.tag}.sql`);
		}
	}

	const sqlFiles = existsSync(drizzleDir)
		? readdirSync(drizzleDir).filter((f) => f.endsWith(".sql"))
		: [];

	for (const file of sqlFiles) {
		const tag = file.slice(0, -".sql".length);
		if (!tags.has(tag)) {
			issues.push(`orphan SQL file (not in journal): ${file}`);
		}
	}

	return { ok: issues.length === 0, issues };
}

/**
 * CLI entry when run directly.
 * @param {string} drizzleDir
 */
export function runAssertMigrationJournal(drizzleDir) {
	const result = assertMigrationJournal(drizzleDir);
	if (!result.ok) {
		console.error("@afenda/db journal assert FAILED:");
		for (const issue of result.issues) {
			console.error(`  - ${issue}`);
		}
		process.exit(1);
	}
	console.log("@afenda/db journal assert OK");
}
