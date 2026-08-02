import { describe, expect, it } from "vitest";
import { getHistoricalReconciliationDisposition } from "../scripts/lib/historical-migration-execution.mjs";
import { planIdentityMigrations } from "../scripts/lib/identity-migrator.mjs";
import { listMigrationDdlProbeTags } from "../scripts/lib/migration-ddl-probes.mjs";
import {
	findPendingMigrationJournalRows,
	reconcileMigrationJournalRows,
	summarizeMigrationJournalRows,
} from "../scripts/lib/migration-journal-rows.mjs";

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

describe("reconcileMigrationJournalRows", () => {
	const journalRows = [
		{ idx: 0, tag: "0000_a", when: 100, hash: "hash-a" },
		{ idx: 1, tag: "0001_b", when: 200, hash: "hash-b" },
	];

	it("names pending journal rows and unknown database rows independently", () => {
		const result = reconcileMigrationJournalRows(journalRows, [
			{ id: 10, hash: "hash-a", created_at: 100 },
			{ id: 11, hash: "unknown", created_at: 150 },
		]);
		expect(result.rows.map((row) => row.status)).toEqual([
			"applied",
			"pending",
		]);
		expect(result.rows[1]?.journalFilename).toBe("0001_b.sql");
		expect(result.unknownDatabaseRows).toEqual([
			expect.objectContaining({
				ledgerId: 11,
				status: "unknown in database",
			}),
		]);
	});

	it("detects hash divergence at the governed timestamp", () => {
		const result = reconcileMigrationJournalRows(journalRows, [
			{ id: 10, hash: "changed", created_at: 100 },
		]);
		expect(result.rows[0]?.status).toBe("hash mismatch");
		expect(result.unknownDatabaseRows).toEqual([]);
	});

	it("detects a matching hash recorded under the wrong timestamp", () => {
		const result = reconcileMigrationJournalRows(journalRows, [
			{ id: 10, hash: "hash-a", created_at: 999 },
		]);
		expect(result.rows[0]?.status).toBe("identity mismatch");
		expect(result.unknownDatabaseRows).toEqual([]);
	});
});

describe("summarizeMigrationJournalRows", () => {
	it("distinguishes the contiguous frontier from later applied identities", () => {
		const summary = summarizeMigrationJournalRows([
			{ journalTag: "0000_a", status: "applied" },
			{ journalTag: "0001_b", status: "pending" },
			{ journalTag: "0002_c", status: "pending" },
			{ journalTag: "0003_d", status: "applied" },
		]);

		expect(summary).toEqual({
			contiguousAppliedThroughTag: "0000_a",
			pendingCount: 2,
			divergentCount: 0,
			outOfOrderAppliedTags: ["0003_d"],
		});
	});
});

describe("migration DDL probe registry", () => {
	it("contains only governed tags and covers the current pending identities", async () => {
		const { readFileSync } = await import("node:fs");
		const { fileURLToPath } = await import("node:url");
		const { dirname, join } = await import("node:path");
		const root = join(dirname(fileURLToPath(import.meta.url)), "..");
		const journal = JSON.parse(
			readFileSync(join(root, "drizzle", "meta", "_journal.json"), "utf8"),
		) as { entries: { tag: string }[] };
		const journalTags = new Set(journal.entries.map((entry) => entry.tag));
		const probeTags = listMigrationDdlProbeTags();

		expect(probeTags.every((tag) => journalTags.has(tag))).toBe(true);
		expect(probeTags).toEqual(
			expect.arrayContaining([
				"0034_ca_governance_bodies_memberships",
				"0035_ca_statutory_offices_officers",
				"0036_ca_officer_compliance",
				"0037_ca_governance_meetings",
				"0038_ca_resolutions",
				"0039_hr_reliability_scheduler",
				"0040_hr_bulk_jobs",
				"0042_platform_tenant_access_indexes",
				"0043_event_claim_lease",
				"0044_payroll_setup_rule_ranges",
				"0045_payroll_assignment_ranges",
				"0046_payroll_outputs_reconciliation_adjustments",
			]),
		);
	});
});

describe("planIdentityMigrations", () => {
	it("selects missing earlier identities even when a later migration is applied", () => {
		const journalRows = [
			{ idx: 33, tag: "0033_applied", when: 330, hash: "hash-33" },
			{ idx: 34, tag: "0034_pending", when: 340, hash: "hash-34" },
			{ idx: 35, tag: "0035_pending", when: 350, hash: "hash-35" },
			{ idx: 41, tag: "0041_applied", when: 410, hash: "hash-41" },
		];
		const pending = planIdentityMigrations(journalRows, [
			{ id: 34, hash: "hash-33", created_at: 330 },
			{ id: 35, hash: "hash-41", created_at: 410 },
		]);
		expect(pending.map((row) => row.tag)).toEqual([
			"0034_pending",
			"0035_pending",
		]);
	});

	it("fails closed on a divergent applied identity", () => {
		expect(() =>
			planIdentityMigrations(
				[{ idx: 41, tag: "0041_applied", when: 410, hash: "expected" }],
				[{ id: 35, hash: "different", created_at: 410 }],
			),
		).toThrow(/divergence/);
	});
});

describe("historical reconciliation execution", () => {
	it("records 0033 without replaying repair SQL only when all sources are applied", () => {
		const allSources = new Set([
			"0005_uneven_rage",
			"0006_cynical_roxanne_simpson",
			"0007_rich_proudstar",
			"0008_cloudy_strong_guy",
			"0009_lively_paibok",
			"0010_party_address_structured",
			"0011_party_contact_structured",
			"0012_party_external_id_structured",
			"0013_party_relationship_governed",
			"0014_item_uom_governed",
			"0015_item_barcode_governed",
			"0016_item_external_id_governed",
			"0017_item_alias_governed",
			"0018_warehouse_external_id_governed",
			"0019_template_attribute_governed",
			"0020_variant_attribute_value_typed",
			"0021_primary_record_scope",
			"0022_extension_database_constraints",
			"0024_item_core_operational_profile",
			"0025_warehouse_payment_tax_masters",
			"0027_master_data_database_constraints",
			"0028_ca_company_status_lifecycle",
			"0029_master_data_import_recovery",
		]);
		const migration = {
			tag: "0033_schema_reconciliation",
			hash: "4bb8065d004b267c30bca010c8042c9815a2213cd8a0638d861b018bebab2dbf",
		};
		expect(
			getHistoricalReconciliationDisposition(migration, allSources),
		).toMatchObject({ status: "historical-reconciliation-satisfied" });
		allSources.delete("0029_master_data_import_recovery");
		expect(() =>
			getHistoricalReconciliationDisposition(migration, allSources),
		).toThrow(/missing source identities/);
	});
});

describe("generated baseline migration journal row", () => {
	it("uses the generated baseline slot", async () => {
		const row = await findJournalEntry("0000_damp_blue_shield");
		expect(row).toMatchObject({ idx: 0, when: 1_785_123_236_021 });
	});
});

describe("custom relational-invariant migration journal row", () => {
	it("follows the generated baseline", async () => {
		const row = await findJournalEntry("0001_ca_relational_invariants");
		expect(row).toMatchObject({ idx: 1, when: 1_785_123_522_429 });
	});
});

describe("HR tenant foreign-key migration journal row", () => {
	it("follows the relational-invariant migration", async () => {
		const row = await findJournalEntry("0002_hr_tenant_foreign_keys");
		expect(row).toMatchObject({ idx: 2, when: 1_785_124_084_741 });
	});
});
