import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(
	fileURLToPath(new URL("../../../../", import.meta.url)),
);

const downstreamSrcDirs = [
	"packages/erp/sales/src",
	"packages/erp/purchasing/src",
	"packages/erp/inventory/src",
	"packages/erp/accounting/src",
];

const forbiddenMasterMutations = [
	"createParty",
	"updateParty",
	"activateParty",
	"suspendParty",
	"archiveParty",
	"restoreParty",
	"createPartyRole",
	"updatePartyRole",
	"activatePartyRole",
	"deactivatePartyRole",
	"archivePartyRole",
	"createItem",
	"updateItem",
	"activateItem",
	"suspendItem",
	"archiveItem",
	"restoreItem",
	"createWarehouse",
	"updateWarehouse",
	"activateWarehouse",
	"suspendWarehouse",
	"archiveWarehouse",
	"createPaymentTerm",
	"updatePaymentTerm",
	"createTaxRegistration",
	"updateTaxRegistration",
	"activateTaxRegistration",
	"revokeTaxRegistration",
	"archiveTaxRegistration",
];

const forbiddenMasterTables = [
	"mdParty",
	"mdPartyRole",
	"mdItem",
	"mdWarehouse",
	"mdPaymentTerm",
	"mdTaxRegistration",
	"md_party",
	"md_party_role",
	"md_item",
	"md_warehouse",
	"md_payment_term",
	"md_tax_registration",
];

function listTypeScriptFiles(dir: string): string[] {
	const entries = readdirSync(dir);
	const files: string[] = [];
	for (const entry of entries) {
		const path = join(dir, entry);
		const stat = statSync(path);
		if (stat.isDirectory()) {
			files.push(...listTypeScriptFiles(path));
		} else if (path.endsWith(".ts")) {
			files.push(path);
		}
	}
	return files;
}

describe("cross-module master-data reference contract", () => {
	it("allows downstream ERP modules to reference master IDs without mutating masters", () => {
		const violations: string[] = [];
		for (const srcDir of downstreamSrcDirs) {
			for (const file of listTypeScriptFiles(join(repoRoot, srcDir))) {
				const text = readFileSync(file, "utf8");
				for (const mutation of forbiddenMasterMutations) {
					const importPattern = new RegExp(
						`import\\s*\\{[^}]*\\b${mutation}\\b[^}]*\\}\\s*from\\s*["']@afenda/master-data["']`,
						"su",
					);
					if (importPattern.test(text)) {
						violations.push(`${relative(repoRoot, file)} imports ${mutation}`);
					}
				}
				for (const table of forbiddenMasterTables) {
					const dbImportPattern = new RegExp(
						`import\\s*\\{[^}]*\\b${table}\\b[^}]*\\}\\s*from\\s*["']@afenda/db["']`,
						"su",
					);
					const dmlPattern = new RegExp(
						`\\b(?:insert\\s+into|update|delete\\s+from)\\s+["']?${table}["']?\\b`,
						"iu",
					);
					if (dbImportPattern.test(text) || dmlPattern.test(text)) {
						violations.push(`${relative(repoRoot, file)} mutates ${table}`);
					}
				}
			}
		}
		expect(violations).toEqual([]);
	});
});
