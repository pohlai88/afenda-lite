import { describe, expect, it } from "vitest";

import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

describe("HR bulk and reliability durability migration", () => {
	it("owns tenant-bound bulk checkpoint, audit, and error artifacts", () => {
		const sql = readMigrationSqlForTables([
			"hr_bulk_import_checkpoint",
			"hr_bulk_import_audit",
			"hr_bulk_import_error_artifact",
		]);
		expect(sql).toContain('"hr_bulk_import_checkpoint_org_idempotency_uidx"');
		expect(sql).toContain('"hr_bulk_import_checkpoint_org_batch_uidx"');
		expect(sql).toContain(
			'"hr_bulk_import_audit_org_checkpoint_sequence_uidx"',
		);
		expect(sql).toContain('FOREIGN KEY ("organization_id", "checkpoint_id")');
		expect(sql).toContain(
			'"hr_bulk_import_error_artifact_org_checkpoint_version_uidx"',
		);
	});

	it("owns CAS reliability work, atomic dead letters, and connector cursors", () => {
		const sql = readMigrationSqlForTables([
			"hr_reliability_work_item",
			"hr_reliability_dead_letter",
			"hr_connector_cursor",
		]);
		expect(sql).toContain(
			'"hr_reliability_work_item_org_connector_idempotency_uidx"',
		);
		expect(sql).toContain('"hr_reliability_dead_letter_org_work_item_uidx"');
		expect(sql).toContain('"replayed_by_work_item_id" uuid');
		expect(sql).toContain(
			'PRIMARY KEY ("organization_id", "connector", "stream")',
		);
		expect(sql).toContain('"version" integer NOT NULL');
	});
});
