import { describe, expect, it } from "vitest";

import { findPendingMigrationJournalRows } from "../scripts/lib/migration-journal-rows.mjs";

async function findJournalEntry(tag: string) {
	const { readFileSync } = await import("node:fs");
	const { fileURLToPath } = await import("node:url");
	const { dirname, join } = await import("node:path");
	const root = join(dirname(fileURLToPath(import.meta.url)), "..");
	const journal = JSON.parse(
		readFileSync(join(root, "drizzle", "meta", "_journal.json"), "utf8"),
	) as { entries: { idx: number; tag: string; when: number }[] };
	return journal.entries.find((entry) => entry.tag === tag);
}

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

describe("generated baseline migration journal row", () => {
	it("uses the generated baseline slot", async () => {
		const row = await findJournalEntry("0000_damp_blue_shield");
		expect(row).toMatchObject({ idx: 0, when: 1785123236021 });
	});
});

describe("custom relational-invariant migration journal row", () => {
	it("follows the generated baseline", async () => {
		const row = await findJournalEntry("0001_ca_relational_invariants");
		expect(row).toMatchObject({ idx: 1, when: 1785123522429 });
	});
});

describe("HR tenant foreign-key migration journal row", () => {
	it("follows the relational-invariant migration", async () => {
		const row = await findJournalEntry("0002_hr_tenant_foreign_keys");
		expect(row).toMatchObject({ idx: 2, when: 1785124084741 });
	});
});
