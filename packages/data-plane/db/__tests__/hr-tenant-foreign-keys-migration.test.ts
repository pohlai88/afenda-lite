import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
	new URL("../drizzle/0012_hr_tenant_foreign_keys.sql", import.meta.url),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR tenant foreign-key migration", () => {
	it("covers all tenant-owned HR foreign references through the catalog", () => {
		expect(migrationSql).toContain("child_table.relname LIKE 'hr\\_%'");
		expect(migrationSql).toContain("cardinality(constraint_row.conkey) = 1");
		expect(migrationSql).toContain("child_org.attname = 'organization_id'");
		expect(migrationSql).toContain("parent_org.attname = 'organization_id'");
		expect(migrationSql).toContain(
			"FOREIGN KEY (organization_id, %I) REFERENCES %I (organization_id, %I)",
		);
	});

	it("validates every replacement constraint before the migration closes", () => {
		expect(migrationSql).toContain("ADD CONSTRAINT %I");
		expect(migrationSql).toContain("NOT VALID");
		expect(migrationSql).toContain("VALIDATE CONSTRAINT %I");
	});
});
