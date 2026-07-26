import { describe, expect, it } from "vitest";

import { findPendingMigrationJournalRows } from "../scripts/lib/migration-journal-rows.mjs";

describe("findPendingMigrationJournalRows", () => {
	const journalRows = [
		{ idx: 0, tag: "0000_a", when: 100, hash: "hash-a" },
		{ idx: 1, tag: "0001_b", when: 200, hash: "hash-b" },
		{ idx: 2, tag: "0002_c", when: 300, hash: "hash-c" },
	];

	it("returns empty pending when journal and ledger align", () => {
		const dbRows = [
			{ hash: "hash-a", created_at: 100 },
			{ hash: "hash-b", created_at: 200 },
			{ hash: "hash-c", created_at: 300 },
		];
		const result = findPendingMigrationJournalRows(journalRows, dbRows);
		expect(result.pending).toEqual([]);
		expect(result.driftIssues).toEqual([]);
	});

	it("detects missing ledger rows", () => {
		const dbRows = [
			{ hash: "hash-a", created_at: 100 },
			{ hash: "hash-c", created_at: 300 },
		];
		const result = findPendingMigrationJournalRows(journalRows, dbRows);
		expect(result.pending).toEqual([
			{
				idx: 1,
				tag: "0001_b",
				when: 200,
				hash: "hash-b",
				kind: "missing",
			},
		]);
	});

	it("detects created_at mismatch drift", () => {
		const dbRows = [
			{ hash: "hash-a", created_at: 100 },
			{ hash: "hash-b", created_at: 999 },
			{ hash: "hash-c", created_at: 300 },
		];
		const result = findPendingMigrationJournalRows(journalRows, dbRows);
		expect(result.pending).toHaveLength(1);
		expect(result.pending[0]?.kind).toBe("created_at_mismatch");
		expect(result.driftIssues[0]).toContain("0001_b");
	});
});

describe("0017_hr_candidate_consent migration journal row", () => {
	it("uses the expected journal timestamp slot", async () => {
		const { loadMigrationJournalRows } = await import(
			"../scripts/lib/migration-journal-rows.mjs"
		);
		const { fileURLToPath } = await import("node:url");
		const { dirname, join } = await import("node:path");
		const root = join(dirname(fileURLToPath(import.meta.url)), "..");
		const row = loadMigrationJournalRows(join(root, "drizzle")).find(
			(entry) => entry.tag === "0017_hr_candidate_consent",
		);
		expect(row?.when).toBe(1784997600000);
	});
});
