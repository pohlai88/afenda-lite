import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";

const migrationPath = fileURLToPath(
	new URL(
		"../drizzle/0040_ca_legal_company_registry_hardening.sql",
		import.meta.url,
	),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("CA legal-company registry hardening migration", () => {
	it("is additive (rename/alter/add only; no DROP COLUMN)", () => {
		const result = assertAdditiveMigrationSql(migrationSql);
		expect(result.ok).toBe(true);
	});

	it("hardens CA-1 registry columns and checks", () => {
		expect(migrationSql).toContain('"ca_legal_company_status_chk"');
		expect(migrationSql).toContain('"ca_company_name_primary_chk"');
		expect(migrationSql).toContain('"is_primary"');
		expect(migrationSql).toContain(
			'RENAME COLUMN "supersedes_id" TO "supersedes_company_name_id"',
		);
		expect(migrationSql).toContain(
			'RENAME COLUMN "normalized_value" TO "normalized_identifier_value"',
		);
		expect(migrationSql).toContain(
			'RENAME COLUMN "effective_date" TO "effective_at"',
		);
		expect(migrationSql).toContain(
			'RENAME COLUMN "evidence_reference" TO "evidence_document_reference"',
		);
		expect(migrationSql).toContain('"authority_party_id"');
		expect(migrationSql).toContain('"jurisdiction_country_id"');
	});
});
