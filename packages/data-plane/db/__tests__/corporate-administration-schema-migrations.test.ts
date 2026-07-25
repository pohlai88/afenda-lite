import { readFileSync } from "node:fs";

import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { HARD_TENANT_ROOT_TABLE_NAMES } from "../src/hard-tenant-roots";
import * as corporateAdministrationSchema from "../src/schema/corporate-administration";

const EXPECTED_TABLE_NAMES = [
	"ca_authority_mandate",
	"ca_bank_account_registration",
	"ca_bank_mandate",
	"ca_beneficial_owner_disclosure",
	"ca_charge",
	"ca_company_identifier",
	"ca_company_name",
	"ca_company_premise",
	"ca_company_status_history",
	"ca_corporate_asset",
	"ca_corporate_document",
	"ca_filing_obligation",
	"ca_filing_submission",
	"ca_governance_body",
	"ca_governance_meeting",
	"ca_governance_membership",
	"ca_group_control_relationship",
	"ca_insurance_policy",
	"ca_intellectual_property_right",
	"ca_legal_company",
	"ca_licence_permit",
	"ca_material_agreement",
	"ca_officer_appointment",
	"ca_property_holding",
	"ca_resolution",
	"ca_share_certificate",
	"ca_share_class",
	"ca_share_transaction",
	"ca_share_transaction_leg",
] as const;

const tables = Object.values(corporateAdministrationSchema);
const migrationSql = Array.from({ length: 8 }, (_, index) => {
	const number = String(index + 19).padStart(4, "0");
	const names = [
		"ca_legal_company_registry",
		"ca_governance_premises",
		"ca_share_capital",
		"ca_property_assets",
		"ca_licences_banking",
		"ca_documents_filings",
		"ca_slice_self_references",
		"ca_performance_indexes",
	];
	return readFileSync(
		new URL(`../drizzle/${number}_${names[index]}.sql`, import.meta.url),
		"utf8",
	);
}).join("\n");

describe("@afenda/db corporate-administration schema and migrations", () => {
	it("exports exactly the 29 authority tables", () => {
		expect(tables.map((table) => getTableName(table)).toSorted()).toEqual(
			[...EXPECTED_TABLE_NAMES].toSorted(),
		);
	});

	it("requires tenant ownership and hard-root registration on every table", () => {
		for (const table of tables) {
			const tableName = getTableName(table);
			expect(getTableColumns(table).organizationId.notNull).toBe(true);
			expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain(tableName);
		}
	});

	it("creates every table and the performance index pack", () => {
		for (const tableName of EXPECTED_TABLE_NAMES) {
			expect(migrationSql).toContain(
				`CREATE TABLE IF NOT EXISTS "${tableName}"`,
			);
		}
		expect(migrationSql).toContain(
			'CREATE INDEX IF NOT EXISTS "ca_legal_company_org_status_idx"',
		);
		expect(migrationSql).toContain(
			'CREATE INDEX IF NOT EXISTS "ca_filing_obligation_org_company_due_idx"',
		);
	});
});
