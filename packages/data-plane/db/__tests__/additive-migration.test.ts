import { describe, expect, it } from "vitest";

import {
	assertAdditiveMigrationSql,
	assertAdditiveMigrations,
	detectDestructiveStatement,
	stripSqlNoise,
} from "../scripts/lib/assert-additive-migration.mjs";

describe("assert-additive-migration", () => {
	it("allows additive CREATE / ALTER ADD COLUMN", () => {
		const sql = `
CREATE TABLE "widgets" ("id" text PRIMARY KEY);
ALTER TABLE "widgets" ADD COLUMN "name" text;
CREATE INDEX "widgets_name_idx" ON "widgets" ("name");
DROP INDEX IF EXISTS "widgets_name_idx";
CREATE INDEX "widgets_name_idx" ON "widgets" ("name");
`;
		expect(assertAdditiveMigrationSql(sql).ok).toBe(true);
	});

	it("ignores DROP TABLE inside comments and string literals", () => {
		const sql = `
-- DROP TABLE secrets;
/* DROP TABLE secrets; */
SELECT 'DROP TABLE secrets';
`;
		expect(assertAdditiveMigrationSql(sql).ok).toBe(true);
	});

	it("denies DROP TABLE", () => {
		const result = assertAdditiveMigrationSql('DROP TABLE "widgets";');
		expect(result.ok).toBe(false);
		expect(result.findings[0]?.reason).toBe("DROP TABLE");
	});

	it("denies TRUNCATE", () => {
		const result = assertAdditiveMigrationSql("TRUNCATE widgets;");
		expect(result.ok).toBe(false);
		expect(result.findings[0]?.reason).toBe("TRUNCATE");
	});

	it("denies ALTER TABLE DROP COLUMN", () => {
		const result = assertAdditiveMigrationSql(
			'ALTER TABLE "widgets" DROP COLUMN "name";',
		);
		expect(result.ok).toBe(false);
		expect(result.findings[0]?.reason).toBe("DROP COLUMN");
	});

	it("does not treat DROP CONSTRAINT as DROP COLUMN", () => {
		expect(
			detectDestructiveStatement(
				'ALTER TABLE "widgets" DROP CONSTRAINT "widgets_name_key"',
			),
		).toBeNull();
	});

	it("override allows destructive SQL", () => {
		const result = assertAdditiveMigrations(["DROP TABLE widgets;"], {
			allowDestructive: true,
		});
		expect(result.ok).toBe(true);
	});

	it("stripSqlNoise removes line comments", () => {
		expect(stripSqlNoise("SELECT 1; -- DROP TABLE x\n")).not.toMatch(/DROP/);
	});
});
