import { describe, expect, it } from "vitest";

import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

const migrationSql = readMigrationSqlForTables([
	"md_organization_dimension",
	"hr_work_assignment",
]);

describe("HR organization dimensions migration", () => {
	it("creates the governed effective-dated master with tenant-safe lineage", () => {
		expect(migrationSql).toContain('CREATE TABLE "md_organization_dimension"');
		expect(migrationSql).toContain('"organization_id" text NOT NULL');
		expect(migrationSql).toContain('"md_org_dimension_kind_check"');
		expect(migrationSql).toContain('"md_org_dimension_effective_range_check"');
		expect(migrationSql).toContain('"md_org_dimension_org_id_uidx"');
		expect(migrationSql).toContain('"md_org_dimension_org_supersedes_fk"');
		expect(migrationSql).toContain(
			'FOREIGN KEY ("organization_id","supersedes_id")',
		);
	});

	it("adds all five assignment identities and immutable key/name snapshots", () => {
		for (const dimension of [
			"legal_entity",
			"business_unit",
			"location",
			"cost_centre",
			"project",
		]) {
			expect(migrationSql).toContain(`"${dimension}_dimension_id" uuid`);
			expect(migrationSql).toContain(`"${dimension}_key_snapshot" text`);
			expect(migrationSql).toContain(`"${dimension}_name_snapshot" text`);
			expect(migrationSql).toContain(
				`FOREIGN KEY ("organization_id","${dimension}_dimension_id")`,
			);
		}
	});
});
