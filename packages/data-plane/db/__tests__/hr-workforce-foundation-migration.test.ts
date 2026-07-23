import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
	new URL("../drizzle/0008_hr_workforce_foundation.sql", import.meta.url),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("HR workforce foundation migration", () => {
	it("creates person and worker tables with tenancy and idempotency indexes", () => {
		expect(migrationSql).toContain('CREATE TABLE "hr_person"');
		expect(migrationSql).toContain('CREATE TABLE "hr_worker"');
		expect(migrationSql).toContain(
			'"organization_id" text NOT NULL',
		);
		expect(migrationSql).toContain(
			'CREATE UNIQUE INDEX "hr_person_org_create_idempotency_uidx"',
		);
		expect(migrationSql).toContain(
			'CREATE UNIQUE INDEX "hr_worker_org_create_idempotency_uidx"',
		);
		expect(migrationSql).toContain(
			'CREATE UNIQUE INDEX "hr_worker_org_person_uidx"',
		);
		expect(migrationSql).toContain(
			'CREATE UNIQUE INDEX "hr_worker_org_employee_uidx"',
		);
	});

	it("enforces tenant-safe identity links and workforce invariants", () => {
		expect(migrationSql).toContain('"hr_worker_type_check"');
		expect(migrationSql).toContain('"hr_worker_status_check"');
		expect(migrationSql).toContain('"hr_worker_effective_dates_check"');
		expect(migrationSql).toContain('"hr_worker_employee_id_check"');
		expect(migrationSql).toContain(
			'"hr_worker_org_person_fk"',
		);
		expect(migrationSql).toContain(
			'"hr_worker_org_employee_fk"',
		);
		expect(migrationSql).toContain(
			'FOREIGN KEY ("organization_id","person_id")',
		);
		expect(migrationSql).toContain(
			'FOREIGN KEY ("organization_id","employee_id")',
		);
	});
});
