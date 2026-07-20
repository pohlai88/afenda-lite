import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { assertMigrationJournal } from "../scripts/lib/assert-migration-journal.mjs";

const dirs: string[] = [];

afterEach(() => {
	for (const dir of dirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

function fixtureDrizzle(
	entries: { idx: number; tag: string }[],
	sqlTags: string[],
) {
	const root = mkdtempSync(join(tmpdir(), "afenda-db-journal-"));
	dirs.push(root);
	const meta = join(root, "meta");
	mkdirSync(meta, { recursive: true });
	writeFileSync(
		join(meta, "_journal.json"),
		JSON.stringify({
			version: "7",
			dialect: "postgresql",
			entries: entries.map((e) => ({
				idx: e.idx,
				version: "7",
				when: 1,
				tag: e.tag,
				breakpoints: true,
			})),
		}),
	);
	for (const tag of sqlTags) {
		writeFileSync(join(root, `${tag}.sql`), "-- fixture\n");
	}
	return root;
}

describe("assertMigrationJournal", () => {
	it("passes for matching journal and SQL", () => {
		const dir = fixtureDrizzle(
			[{ idx: 0, tag: "0000_living-roots-baseline" }],
			["0000_living-roots-baseline"],
		);
		expect(assertMigrationJournal(dir)).toEqual({ ok: true, issues: [] });
	});

	it("allows idx gaps (not gapless)", () => {
		const dir = fixtureDrizzle(
			[
				{ idx: 0, tag: "0000_a" },
				{ idx: 2, tag: "0002_b" },
			],
			["0000_a", "0002_b"],
		);
		expect(assertMigrationJournal(dir).ok).toBe(true);
	});

	it("detects duplicate tags", () => {
		const dir = fixtureDrizzle(
			[
				{ idx: 0, tag: "0000_a" },
				{ idx: 1, tag: "0000_a" },
			],
			["0000_a"],
		);
		const result = assertMigrationJournal(dir);
		expect(result.ok).toBe(false);
		expect(result.issues.some((i) => i.includes("duplicate journal tag"))).toBe(
			true,
		);
	});

	it("detects duplicate idx", () => {
		const dir = fixtureDrizzle(
			[
				{ idx: 0, tag: "0000_a" },
				{ idx: 0, tag: "0001_b" },
			],
			["0000_a", "0001_b"],
		);
		const result = assertMigrationJournal(dir);
		expect(result.ok).toBe(false);
		expect(result.issues.some((i) => i.includes("duplicate journal idx"))).toBe(
			true,
		);
	});

	it("detects out-of-order idx", () => {
		const dir = fixtureDrizzle(
			[
				{ idx: 1, tag: "0001_b" },
				{ idx: 0, tag: "0000_a" },
			],
			["0000_a", "0001_b"],
		);
		const result = assertMigrationJournal(dir);
		expect(result.ok).toBe(false);
		expect(result.issues.some((i) => i.includes("out of order"))).toBe(true);
	});

	it("detects missing SQL for journal tag", () => {
		const dir = fixtureDrizzle([{ idx: 0, tag: "0000_a" }], []);
		const result = assertMigrationJournal(dir);
		expect(result.ok).toBe(false);
		expect(result.issues.some((i) => i.includes("missing SQL"))).toBe(true);
	});

	it("detects orphan SQL files", () => {
		const dir = fixtureDrizzle(
			[{ idx: 0, tag: "0000_a" }],
			["0000_a", "9999_orphan"],
		);
		const result = assertMigrationJournal(dir);
		expect(result.ok).toBe(false);
		expect(result.issues.some((i) => i.includes("orphan SQL"))).toBe(true);
	});
});
