import { readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import {
	expectedVersionSchema,
	masterDataMutationContextSchema,
	updateItemInputSchema,
	updatePartyInputSchema,
	versionedMutationContextSchema,
} from "../src";

const packageRoot = join(import.meta.dirname, "..");

const commandSchemaFiles = [
	"src/capabilities/core-organization-masters/schemas.ts",
	"src/capabilities/core-organization-masters/organization-dimension.ts",
	"src/capabilities/data-governance-workflows/change-request-commands.ts",
	"src/capabilities/data-governance-workflows/import-bulk-commands.ts",
	"src/capabilities/extensions/extension-schemas.ts",
	"src/capabilities/integration-projections/search-projector-commands.ts",
	"src/pagination.ts",
] as const;

const storeContractFile =
	"src/capabilities/core-organization-masters/store.ts" as const;

const repeatedRawContractPatterns = [
	/organizationId:\s*z\.string\(\)\.trim\(\)\.min\(1\)/,
	/actorUserId:\s*z\.string\(\)\.trim\(\)\.min\(1\)/,
	/correlationId:\s*z\.string\(\)\.trim\(\)\.min\(1\)/,
	/expectedVersion:\s*z\.number\(\)\.int\(\)\.positive/,
] as const;

describe("@afenda/master-data command contracts", () => {
	it("publishes one branded mutation context with optional idempotency key", () => {
		const parsed = masterDataMutationContextSchema.parse({
			organizationId: "org_123",
			actorUserId: "user_123",
			correlationId: "corr_123",
			idempotencyKey: "import-001",
		});

		expect(parsed).toEqual({
			organizationId: "org_123",
			actorUserId: "user_123",
			correlationId: "corr_123",
			idempotencyKey: "import-001",
		});
	});

	it("requires positive expectedVersion through the shared versioned context", () => {
		expect(
			versionedMutationContextSchema.safeParse({
				organizationId: "org_123",
				actorUserId: "user_123",
				correlationId: "corr_123",
				expectedVersion: 1,
			}).success,
		).toBe(true);

		expect(
			versionedMutationContextSchema.safeParse({
				organizationId: "org_123",
				actorUserId: "user_123",
				correlationId: "corr_123",
				expectedVersion: 0,
			}).success,
		).toBe(false);
	});

	it("composes update commands from the shared expectedVersion schema", () => {
		expect(updatePartyInputSchema.shape.expectedVersion).toBe(
			expectedVersionSchema,
		);
		expect(updateItemInputSchema.shape.expectedVersion).toBe(
			expectedVersionSchema,
		);
	});

	it("does not repeat raw identity or version schema definitions in command schema modules", () => {
		const violations = commandSchemaFiles.flatMap((file) => {
			const source = readFileSync(join(packageRoot, file), "utf8");
			return repeatedRawContractPatterns
				.filter((pattern) => pattern.test(source))
				.map((pattern) => ({
					file: relative(packageRoot, file),
					pattern: pattern.source,
				}));
		});

		expect(violations).toEqual([]);
	});

	it("composes MasterDataStore from named capability stores and forbids generic mutation executors", () => {
		const source = readFileSync(join(packageRoot, storeContractFile), "utf8");

		for (const capability of [
			"ReferenceQueryStore",
			"OrganizationDimensionStore",
			"PartyStore",
			"ItemGroupStore",
			"ItemStore",
			"WarehouseStore",
			"CommercialMasterStore",
			"ItemTemplateStore",
			"ChangeRequestStore",
			"ImportBatchStore",
			"MergeStore",
		]) {
			expect(source).toContain(capability);
		}
		expect(source).toContain("export interface MasterDataStore");
		expect(source).not.toContain("executeMutation");
	});
});
