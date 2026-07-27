import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";
import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

const migrationSql = readMigrationSqlForTables(["hr_attendance_event"]);

describe("HR attendance event source sequence migration", () => {
	it("defines a required source sequence in the empty-database baseline", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain('"source_sequence" integer NOT NULL');
		expect(migrationSql).toContain(
			'"occurred_at" timestamp with time zone NOT NULL',
		);
		expect(migrationSql).toContain('"local_work_date" date NOT NULL');
	});
});
