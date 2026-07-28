import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	activateItemTemplate,
	addItemTemplateAttribute,
	addItemTemplateAttributeOption,
	createItemGroup,
	createItemTemplate,
	createItemVariant,
	getItemTemplateById,
	getItemVariantById,
	retireItemVariant,
	updateItemTemplate,
} from "../../src";
import type { ItemTemplate } from "../../src/types";
import {
	createDrizzleHarness,
	createMemoryHarness,
	defineRootParityTests,
	type ParityHarness,
	type RootParityContract,
	type StoreFactory,
} from "./parity-harness";

const contract: RootParityContract<ItemTemplate> = {
	create: (harness) =>
		createItemTemplate(
			{
				...harness.context(),
				code: "PARITY-TEMPLATE",
				name: "Parity Template",
			},
			harness.options,
		),
	get: (harness, id, organizationId) =>
		getItemTemplateById(
			{ ...harness.queryContext(organizationId), id },
			harness.options,
		),
	update: (harness, row, expectedVersion) =>
		updateItemTemplate(
			{
				...harness.context(),
				id: row.id,
				expectedVersion,
				name: "Parity Template Updated",
			},
			harness.options,
		),
};

defineRootParityTests(
	"MemoryMasterDataStore variants",
	createMemoryHarness,
	contract,
);
defineRootParityTests(
	"DrizzleMasterDataStore variants",
	createDrizzleHarness,
	contract,
);

async function createVariant(harness: ParityHarness) {
	const template = await createItemTemplate(
		{
			...harness.context(),
			code: "PARITY-VARIANT-TEMPLATE",
			name: "Parity Variant Template",
		},
		harness.options,
	);
	if (!template.ok) return template;
	const attribute = await addItemTemplateAttribute(
		{
			...harness.context(),
			templateId: template.data.id,
			code: "COLOR",
			name: "Color",
			dataType: "single_option",
			isRequired: true,
			isVariantDefining: true,
		},
		harness.options,
	);
	if (!attribute.ok) return attribute;
	const option = await addItemTemplateAttributeOption(
		{
			...harness.context(),
			attributeId: attribute.data.id,
			code: "BLUE",
			label: "Blue",
		},
		harness.options,
	);
	if (!option.ok) return option;
	const activeTemplate = await activateItemTemplate(
		{
			...harness.context(),
			id: template.data.id,
			expectedVersion: template.data.version,
		},
		harness.options,
	);
	if (!activeTemplate.ok) return activeTemplate;
	const group = await createItemGroup(
		{
			...harness.context(),
			code: "PARITY-VARIANT-GROUP",
			name: "Parity Variant Group",
		},
		harness.options,
	);
	if (!group.ok) return group;
	return createItemVariant(
		{
			...harness.context(),
			templateId: activeTemplate.data.id,
			code: "PARITY-BLUE-SKU",
			name: "Parity Blue SKU",
			itemType: "stock",
			baseUomId: harness.uomId,
			itemGroupId: group.data.id,
			attributeValues: [
				{ attributeId: attribute.data.id, optionId: option.data.id },
			],
		},
		harness.options,
	);
}

function defineItemVariantContractTests(
	name: string,
	createStore: StoreFactory,
): void {
	describe(name, () => {
		let harness: ParityHarness;

		beforeEach(async () => {
			harness = await createStore();
		});

		afterEach(async () => {
			await harness.cleanup();
		});

		it("returns a tenant-safe miss for an existing variant", async () => {
			const created = await createVariant(harness);
			expect(created.ok, JSON.stringify(created)).toBe(true);
			if (!created.ok || !("combinationKey" in created.data)) return;
			const result = await getItemVariantById(
				{
					...harness.queryContext(harness.otherOrganizationId),
					id: created.data.id,
				},
				harness.options,
			);
			expect(result).toEqual({ ok: true, data: null });
		});

		it("rejects a stale variant lifecycle version", async () => {
			const created = await createVariant(harness);
			expect(created.ok, JSON.stringify(created)).toBe(true);
			if (!created.ok || !("combinationKey" in created.data)) return;
			const stale = await retireItemVariant(
				{
					...harness.context(),
					id: created.data.id,
					expectedVersion: created.data.version + 1,
				},
				harness.options,
			);
			expect(stale.ok).toBe(false);
			if (!stale.ok) {
				expect(stale.code).toBe("CONFLICT");
				expect(stale.details).toMatchObject({
					reason: "MASTER_VERSION_CONFLICT",
				});
			}
		});
	});
}

defineItemVariantContractTests(
	"MemoryMasterDataStore item variant",
	createMemoryHarness,
);
defineItemVariantContractTests(
	"DrizzleMasterDataStore item variant",
	createDrizzleHarness,
);
