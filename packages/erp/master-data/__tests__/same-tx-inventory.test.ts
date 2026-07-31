import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { errorResult } from "@afenda/errors";
import { describe, expect, it } from "vitest";

import { createParty } from "../src";
import type { MutationPorts } from "../src/ports";
import { resolveAsync } from "../src/resolve-async";
import { createMasterDataTestHarness } from "./helpers/harness";

const drizzleStorePath = join(
	dirname(fileURLToPath(import.meta.url)),
	"../src/drizzle-store.ts",
);

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const commandSourceFiles = [
	"src/capabilities/core-organization-masters/item.ts",
	"src/capabilities/core-organization-masters/item-group.ts",
	"src/capabilities/core-organization-masters/organization-dimension.ts",
	"src/capabilities/core-organization-masters/party.ts",
	"src/capabilities/core-organization-masters/payment-term.ts",
	"src/capabilities/core-organization-masters/tax-registration.ts",
	"src/capabilities/core-organization-masters/warehouse.ts",
	"src/capabilities/data-governance-workflows/change-request-commands.ts",
	"src/capabilities/data-governance-workflows/import-bulk-commands.ts",
	"src/capabilities/extensions/party-roles.ts",
	"src/capabilities/extensions/party-addresses.ts",
	"src/capabilities/extensions/party-contacts.ts",
	"src/capabilities/extensions/party-external-ids.ts",
	"src/capabilities/extensions/party-relationships.ts",
	"src/capabilities/extensions/item-uoms.ts",
	"src/capabilities/extensions/item-barcodes.ts",
	"src/capabilities/extensions/item-external-ids.ts",
	"src/capabilities/extensions/item-aliases.ts",
	"src/capabilities/core-organization-masters/item-template-variant.ts",
] as const;

describe("@afenda/master-data same-TX inventory", () => {
	it("embeds runNeonHttpTransaction for every org mutation surface", () => {
		const source = readFileSync(drizzleStorePath, "utf8");
		expect(source).not.toContain("afterWritePorts");
		const mutationMethods = [
			"async createParty(",
			"async updateParty(",
			"async transitionParty(",
			"async createItemGroup(",
			"async updateItemGroup(",
			"async transitionItemGroup(",
			"async createItem(",
			"async updateItem(",
			"transitionItem = drizzleTransitionItemWithVariantSideEffect",
			"async createWarehouse(",
			"async updateWarehouse(",
			"async moveWarehouse(",
			"async transitionWarehouse(",
			"async createPaymentTerm(",
			"async updatePaymentTerm(",
			"async transitionPaymentTerm(",
			"async createTaxRegistration(",
			"async updateTaxRegistration(",
			"async transitionTaxRegistration(",
			"createChangeRequest = drizzleCreateChangeRequest",
			"transitionChangeRequest = drizzleTransitionChangeRequest",
			"createPartyRole = drizzleCreatePartyRole",
			"transitionPartyRole = drizzleTransitionPartyRole",
			"createPartyAddress = drizzleCreatePartyAddress",
			"updatePartyAddress = drizzleUpdatePartyAddress",
			"createPartyContact = drizzleCreatePartyContact",
			"updatePartyContact = drizzleUpdatePartyContact",
			"createPartyExternalId = drizzleCreatePartyExternalId",
			"createPartyRelationship = drizzleCreatePartyRelationship",
			"createItemUom = drizzleCreateItemUom",
			"createItemBarcode = drizzleCreateItemBarcode",
			"createItemExternalId = drizzleCreateItemExternalId",
			"createItemAlias = drizzleCreateItemAlias",
			"createWarehouseExternalId = drizzleCreateWarehouseExternalId",
			"createItemTemplate = drizzleCreateItemTemplate",
			"updateItemTemplate = drizzleUpdateItemTemplate",
			"transitionItemTemplate = drizzleTransitionItemTemplate",
			"addItemTemplateAttribute = drizzleAddItemTemplateAttribute",
			"addItemTemplateAttributeOption = drizzleAddItemTemplateAttributeOption",
			"createItemVariant = drizzleCreateItemVariant",
		];
		for (const method of mutationMethods) {
			expect(source).toContain(method);
		}
		expect(source).toContain("base_uom AS (");
		expect(source).toContain("INSERT INTO md_item_uom (");
		const extensionSource = readFileSync(
			join(
				dirname(fileURLToPath(import.meta.url)),
				"../src/capabilities/extensions/adapters/drizzle/extension-mutations.ts",
			),
			"utf8",
		);
		const changeRequestSource = readFileSync(
			join(
				dirname(fileURLToPath(import.meta.url)),
				"../src/capabilities/data-governance-workflows/drizzle-change-request-store.ts",
			),
			"utf8",
		);
		const variantSource = readFileSync(
			join(
				dirname(fileURLToPath(import.meta.url)),
				"../src/capabilities/extensions/adapters/drizzle/variant-mutations.ts",
			),
			"utf8",
		);
		const combined = `${source}\n${extensionSource}\n${changeRequestSource}\n${variantSource}`;
		const txCalls = combined.match(/runNeonHttpTransaction/g) ?? [];
		expect(txCalls.length).toBeGreaterThanOrEqual(mutationMethods.length);
	});

	it("keeps application command files out of split entity/audit/outbox writes", () => {
		const forbiddenPatterns = [
			/ports\.audit\.record/,
			/ports\.outbox\.append/,
			/audit\.write/,
			/outbox\.publish/,
		] as const;

		const violations = commandSourceFiles.flatMap((file) => {
			const source = readFileSync(join(packageRoot, file), "utf8");
			return forbiddenPatterns
				.filter((pattern) => pattern.test(source))
				.map((pattern) => `${file}: ${pattern.source}`);
		});

		expect(violations).toEqual([]);
	});

	it("rolls back memory entity writes when outbox evidence fails", async () => {
		const { options, ports, store } = createMasterDataTestHarness();
		const failingPorts: MutationPorts = {
			...ports,
			outbox: {
				append() {
					return resolveAsync(() => errorResult.fail("INTERNAL_ERROR"));
				},
			},
		};

		const created = await createParty(
			{
				organizationId: "org-tx",
				actorUserId: "user-1",
				correlationId: "corr-tx",
				code: "ROLLBACK",
				name: "Rollback Party",
				partyKind: "organization",
			},
			{ ...options, ports: failingPorts },
		);

		expect(created.ok).toBe(false);

		const persisted = await store.getPartyByCode("org-tx", "ROLLBACK");
		expect(persisted.ok).toBe(true);
		if (persisted.ok) {
			expect(persisted.data).toBeNull();
		}
	});
});
