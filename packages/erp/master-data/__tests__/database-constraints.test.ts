import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MASTER_DATA_DATABASE_CONSTRAINT_REQUIREMENTS } from "../src";

const packageRoot = join(import.meta.dirname, "..");

const requiredKinds = [
	"organization_normalized_code_unique",
	"version_positive_check",
	"conversion_factor_positive_check",
	"non_reflexive_party_relationship_check",
	"same_authority_foreign_key",
	"primary_record_partial_unique",
	"active_external_id_partial_unique",
	"barcode_scope_unique",
	"variant_attribute_unique",
	"template_attribute_option_code_unique",
] as const;

describe("@afenda/master-data database constraint contract", () => {
	it("declares the DB-owned enforcement required beyond application checks", () => {
		expect(
			MASTER_DATA_DATABASE_CONSTRAINT_REQUIREMENTS.map((row) => row.kind),
		).toEqual(requiredKinds);

		for (const requirement of MASTER_DATA_DATABASE_CONSTRAINT_REQUIREMENTS) {
			expect(requirement.owner).toBe("@afenda/db");
			expect(requirement.rationale.length).toBeGreaterThan(0);
			expect(requirement.constraintNames.length).toBeGreaterThan(0);
		}
	});

	it("keeps the concrete DB evidence in @afenda/db, not package-local shims", () => {
		for (const path of [
			"../../data-plane/db/src/schema/master-data.ts",
			"../../data-plane/db/__tests__/master-data-schema.test.ts",
			"../../data-plane/db/__tests__/master-data-extension-contract.test.ts",
		]) {
			expect(existsSync(join(packageRoot, path)), path).toBe(true);
		}
	});
});
