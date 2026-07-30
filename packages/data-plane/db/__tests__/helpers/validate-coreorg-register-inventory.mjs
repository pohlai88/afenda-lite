/**
 * Validates hr-coreorg-db-invariant-exclusion-register.json inventory against schema pgTables.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function loadCoreorgExclusionRegister(registerPath) {
	return JSON.parse(readFileSync(registerPath, "utf8"));
}

export function listHrPgTableNames(schemaSource) {
	const names = [];
	const pattern = /export const hr\w+ = pgTable\(\s*\n\s*"(hr_[^"]+)"/g;
	for (const match of schemaSource.matchAll(pattern)) {
		names.push(match[1]);
	}
	return names;
}

export function validateCoreorgRegisterInventory({ register, pgTableNames }) {
	const { ddl, notApplicable, scaffolds } =
		register.categoryInventory.startEndRange;
	const all = [...ddl, ...notApplicable, ...scaffolds];
	const duplicates = [
		...new Set(all.filter((name, index) => all.indexOf(name) !== index)),
	];
	const missing = pgTableNames.filter((name) => !all.includes(name));
	const extra = all.filter(
		(name) => !(pgTableNames.includes(name) || scaffolds.includes(name)),
	);

	return {
		pgTableCount: pgTableNames.length,
		inventoryCount: all.length,
		uniqueCount: new Set(all).size,
		duplicates,
		missing,
		extra,
		ddlCount: ddl.length,
		notApplicableCount: notApplicable.length,
		scaffoldCount: scaffolds.length,
	};
}

export function resolveCoreorgRegisterPaths(importMetaUrl) {
	const registerPath = fileURLToPath(
		new URL(
			"../../../../docs-V2/_scratch/erp/human-resources-enterprise-audit/hr-coreorg-db-invariant-exclusion-register.json",
			importMetaUrl,
		),
	);
	const schemaPath = fileURLToPath(
		new URL("../src/schema/human-resources.ts", importMetaUrl),
	);
	return { registerPath, schemaPath };
}
