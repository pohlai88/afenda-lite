import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
	isPlatformPermissionCodeV1,
	PLATFORM_PERMISSION_CODES_V1,
	PLATFORM_PERMISSION_V1,
	PLATFORM_ROLE_TEMPLATES_V1,
} from "../src/platform-permission-catalog";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

const CORPORATE_ADMINISTRATION_PERMISSION_CODES = [
	"corporate_administration.access",
	"corporate_administration.company.read",
	"corporate_administration.company.manage",
	"corporate_administration.company.activate",
	"corporate_administration.company.dissolve",
	"corporate_administration.establishment.manage",
	"corporate_administration.governance.read",
	"corporate_administration.governance.manage",
	"corporate_administration.officer.manage",
	"corporate_administration.meeting.manage",
	"corporate_administration.resolution.manage",
	"corporate_administration.authority.read",
	"corporate_administration.authority.manage",
	"corporate_administration.authority.publish",
	"corporate_administration.seal.manage",
	"corporate_administration.capital.read",
	"corporate_administration.capital.configure",
	"corporate_administration.capital.post",
	"corporate_administration.capital.reverse",
	"corporate_administration.ownership.read",
	"corporate_administration.ownership.manage",
	"corporate_administration.ubo.read",
	"corporate_administration.ubo.manage",
	"corporate_administration.ubo.attest",
	"corporate_administration.distribution.declare",
	"corporate_administration.assets.read",
	"corporate_administration.assets.manage",
	"corporate_administration.licence.manage",
	"corporate_administration.charge.manage",
	"corporate_administration.banking.read",
	"corporate_administration.banking.manage",
	"corporate_administration.bank_mandate.manage",
	"corporate_administration.group.read",
	"corporate_administration.group.manage",
	"corporate_administration.related_party.manage",
	"corporate_administration.agreement.manage",
	"corporate_administration.corporate_action.manage",
	"corporate_administration.corporate_action.approve_effect",
	"corporate_administration.document.read",
	"corporate_administration.document.manage",
	"corporate_administration.register.certify",
	"corporate_administration.compliance_rule.manage",
	"corporate_administration.filing.read",
	"corporate_administration.filing.manage",
	"corporate_administration.filing.waive",
	"corporate_administration.import.prepare",
	"corporate_administration.import.approve",
	"corporate_administration.import.apply",
	"corporate_administration.export",
	"corporate_administration.reconcile",
	"corporate_administration.sensitive_export",
	"corporate_administration.module_admin",
] as const;

const LEGACY_CORPORATE_ADMINISTRATION_PERMISSION_CODES = [
	"corporate-administration.company.create",
	"corporate-administration.company.update",
	"corporate-administration.company.activate",
	"corporate-administration.company.suspend",
	"corporate-administration.company.dissolve",
	"corporate-administration.company.archive",
	"corporate-administration.company.read",
	"corporate-administration.company.list",
	"corporate-administration.company-name.manage",
	"corporate-administration.company-identifier.manage",
	"corporate-administration.governance.manage",
	"corporate-administration.governance.read",
	"corporate-administration.share-capital.manage",
	"corporate-administration.share-capital.read",
	"corporate-administration.property-assets.manage",
	"corporate-administration.property-assets.read",
	"corporate-administration.licences-banking.manage",
	"corporate-administration.licences-banking.read",
	"corporate-administration.documents-filings.manage",
	"corporate-administration.documents-filings.read",
	"corporate-administration.compliance.read",
] as const;

function templateCodes(templateKey: string): readonly string[] {
	const template = PLATFORM_ROLE_TEMPLATES_V1.find(
		(row) => row.templateKey === templateKey,
	);
	expect(template).toBeDefined();
	return template?.permissionCodes ?? [];
}

describe("Corporate Administration legacy retirement", () => {
	it("keeps the retired schema source absent after the forward drop migration", () => {
		expect(
			existsSync(
				path.join(packageRoot, "src/schema/corporate-administration.ts"),
			),
		).toBe(false);

		const schemaBarrel = readFileSync(
			path.join(packageRoot, "src/schema/index.ts"),
			"utf8",
		);
		expect(schemaBarrel).not.toContain("corporate-administration");
	});

	it("retains the forward migration that removes every legacy ca_* table", () => {
		const migration = readFileSync(
			path.join(
				packageRoot,
				"drizzle/0050_drop_corporate_administration_module.sql",
			),
			"utf8",
		);

		expect(migration).toContain("tablename LIKE 'ca\\_%' ESCAPE '\\'");
		expect(migration).toContain("DROP TABLE IF EXISTS %I CASCADE");
	});

	it("registers exactly the 52 living Corporate Administration permissions", () => {
		const livingCodes = PLATFORM_PERMISSION_CODES_V1.filter((code) =>
			code.startsWith("corporate_administration."),
		);
		expect(livingCodes).toEqual(CORPORATE_ADMINISTRATION_PERMISSION_CODES);
		expect(new Set(livingCodes).size).toBe(52);

		const livingRows = PLATFORM_PERMISSION_V1.filter(
			(row) => row.module === "corporate_administration",
		);
		expect(livingRows).toHaveLength(52);
		expect(livingRows.every((row) => row.description.length > 0)).toBe(true);
		expect(
			CORPORATE_ADMINISTRATION_PERMISSION_CODES.every((code) =>
				isPlatformPermissionCodeV1(code),
			),
		).toBe(true);
	});

	it("keeps every legacy hyphenated permission outside the living catalog", () => {
		for (const code of LEGACY_CORPORATE_ADMINISTRATION_PERMISSION_CODES) {
			expect(PLATFORM_PERMISSION_CODES_V1).not.toContain(code);
			expect(isPlatformPermissionCodeV1(code)).toBe(false);
		}
	});

	it("grants living permissions only to the Org Admin template", () => {
		const orgAdminCodes = templateCodes("org_admin");
		const editorCodes = templateCodes("editor");
		const viewerCodes = templateCodes("viewer");

		for (const code of CORPORATE_ADMINISTRATION_PERMISSION_CODES) {
			expect(orgAdminCodes).toContain(code);
			expect(editorCodes).not.toContain(code);
			expect(viewerCodes).not.toContain(code);
		}
	});
});
