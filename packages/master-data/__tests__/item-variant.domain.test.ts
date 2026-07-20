import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";
import { getItemById, retireItem } from "../src/item";
import { createItemGroup } from "../src/item-group";
import {
	activateItemTemplate,
	addItemTemplateAttribute,
	addItemTemplateAttributeOption,
	createItemTemplate,
	createItemVariant,
	getItemVariantById,
	updateItemTemplate,
} from "../src/item-variant";
import { createMasterDataTestHarness } from "./helpers/harness";
import type { createMemoryMasterDataStore } from "./helpers/memory-master-data-store";
import type { createMemoryMutationPorts } from "./helpers/memory-ports";

const EA_UOM_ID = "b1000000-0000-4000-8000-000000000001";

function ctx(organizationId = "org-a") {
	return {
		organizationId,
		actorUserId: "user-1",
		correlationId: randomUUID(),
	};
}

async function seedActiveTemplate(options: {
	store: ReturnType<typeof createMemoryMasterDataStore>;
	ports: ReturnType<typeof createMemoryMutationPorts>;
	organizationId?: string;
}) {
	const organizationId = options.organizationId ?? "org-a";
	const template = await createItemTemplate(
		{
			...ctx(organizationId),
			code: "TEE",
			name: "T-shirt template",
		},
		options,
	);
	expect(template.ok).toBe(true);
	if (!template.ok) {
		throw new Error("template create failed");
	}
	const color = await addItemTemplateAttribute(
		{
			...ctx(organizationId),
			templateId: template.data.id,
			code: "COLOR",
			name: "Color",
			valueKind: "option",
			isRequired: true,
			sortOrder: 1,
		},
		options,
	);
	expect(color.ok).toBe(true);
	if (!color.ok) {
		throw new Error("color attr failed");
	}
	const red = await addItemTemplateAttributeOption(
		{
			...ctx(organizationId),
			attributeId: color.data.id,
			code: "RED",
			label: "Red",
			sortOrder: 1,
		},
		options,
	);
	expect(red.ok).toBe(true);
	if (!red.ok) {
		throw new Error("red option failed");
	}
	const blue = await addItemTemplateAttributeOption(
		{
			...ctx(organizationId),
			attributeId: color.data.id,
			code: "BLUE",
			label: "Blue",
			sortOrder: 2,
		},
		options,
	);
	expect(blue.ok).toBe(true);
	if (!blue.ok) {
		throw new Error("blue option failed");
	}
	const activated = await activateItemTemplate(
		{
			...ctx(organizationId),
			id: template.data.id,
			expectedVersion: template.data.version,
		},
		options,
	);
	expect(activated.ok).toBe(true);
	if (!activated.ok) {
		throw new Error("activate failed");
	}
	const group = await createItemGroup(
		{
			...ctx(organizationId),
			code: "APPAREL",
			name: "Apparel",
		},
		options,
	);
	expect(group.ok).toBe(true);
	if (!group.ok) {
		throw new Error("group failed");
	}
	return {
		template: activated.data,
		color: color.data,
		red: red.data,
		blue: blue.data,
		group: group.data,
	};
}

describe("@afenda/master-data item variants (R1)", () => {
	it("rejects duplicate attribute codes within a template", async () => {
		const { options } = createMasterDataTestHarness();
		const template = await createItemTemplate(
			{ ...ctx(), code: "TMP", name: "Template" },
			options,
		);
		expect(template.ok).toBe(true);
		if (!template.ok) {
			return;
		}
		const first = await addItemTemplateAttribute(
			{
				...ctx(),
				templateId: template.data.id,
				code: "SIZE",
				name: "Size",
				valueKind: "text",
			},
			options,
		);
		expect(first.ok).toBe(true);
		const dup = await addItemTemplateAttribute(
			{
				...ctx(),
				templateId: template.data.id,
				code: "size",
				name: "Size again",
				valueKind: "text",
			},
			options,
		);
		expect(dup.ok).toBe(false);
		if (!dup.ok) {
			expect(dup.details).toMatchObject({ reason: "MASTER_CODE_CONFLICT" });
		}
	});

	it("enforces live variant item code uniqueness", async () => {
		const { options } = createMasterDataTestHarness();
		const seeded = await seedActiveTemplate(options);
		const first = await createItemVariant(
			{
				...ctx(),
				templateId: seeded.template.id,
				code: "TEE-RED",
				name: "Tee Red",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: seeded.group.id,
				attributeValues: [
					{ attributeId: seeded.color.id, optionId: seeded.red.id },
				],
			},
			options,
		);
		expect(first.ok).toBe(true);
		const dupCode = await createItemVariant(
			{
				...ctx(),
				templateId: seeded.template.id,
				code: "tee-red",
				name: "Tee Red 2",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: seeded.group.id,
				attributeValues: [
					{ attributeId: seeded.color.id, optionId: seeded.blue.id },
				],
			},
			options,
		);
		expect(dupCode.ok).toBe(false);
		if (!dupCode.ok) {
			expect(dupCode.details).toMatchObject({ reason: "MASTER_CODE_CONFLICT" });
		}
	});

	it("enforces unique live attribute combinations within a template", async () => {
		const { options } = createMasterDataTestHarness();
		const seeded = await seedActiveTemplate(options);
		const first = await createItemVariant(
			{
				...ctx(),
				templateId: seeded.template.id,
				code: "TEE-RED-A",
				name: "Tee Red A",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: seeded.group.id,
				attributeValues: [
					{ attributeId: seeded.color.id, optionId: seeded.red.id },
				],
			},
			options,
		);
		expect(first.ok).toBe(true);
		const dupCombo = await createItemVariant(
			{
				...ctx(),
				templateId: seeded.template.id,
				code: "TEE-RED-B",
				name: "Tee Red B",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: seeded.group.id,
				attributeValues: [
					{ attributeId: seeded.color.id, optionId: seeded.red.id },
				],
			},
			options,
		);
		expect(dupCombo.ok).toBe(false);
		if (!dupCombo.ok) {
			expect(dupCombo.details).toMatchObject({
				reason: "MASTER_CODE_CONFLICT",
			});
		}
	});

	it("keeps retired variants resolvable by id", async () => {
		const { options } = createMasterDataTestHarness();
		const seeded = await seedActiveTemplate(options);
		const variant = await createItemVariant(
			{
				...ctx(),
				templateId: seeded.template.id,
				code: "TEE-RETIRE",
				name: "Tee retire",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: seeded.group.id,
				attributeValues: [
					{ attributeId: seeded.color.id, optionId: seeded.red.id },
				],
			},
			options,
		);
		expect(variant.ok).toBe(true);
		if (!variant.ok) {
			return;
		}
		const retired = await retireItem(
			{
				...ctx(),
				id: variant.data.itemId,
				expectedVersion: variant.data.item.version,
			},
			options,
		);
		expect(retired.ok).toBe(true);
		const byId = await getItemById(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				id: variant.data.itemId,
			},
			options,
		);
		expect(byId.ok).toBe(true);
		if (byId.ok) {
			expect(byId.data?.status).toBe("retired");
		}
		const variantById = await getItemVariantById(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				id: variant.data.id,
			},
			options,
		);
		expect(variantById.ok).toBe(true);
		if (variantById.ok && variantById.data) {
			expect(variantById.data.retiredAt).not.toBeNull();
			expect(variantById.data.values).toHaveLength(1);
		}
		const reused = await createItemVariant(
			{
				...ctx(),
				templateId: seeded.template.id,
				code: "TEE-RETIRE-2",
				name: "Tee retire 2",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: seeded.group.id,
				attributeValues: [
					{ attributeId: seeded.color.id, optionId: seeded.red.id },
				],
			},
			options,
		);
		expect(reused.ok).toBe(true);
	});

	it("isolates tenancy on template load", async () => {
		const { options } = createMasterDataTestHarness();
		const seeded = await seedActiveTemplate({
			...options,
			organizationId: "org-a",
		});
		const other = await getItemVariantById(
			{
				organizationId: "org-b",
				actorUserId: "user-1",
				id: seeded.template.id,
			},
			options,
		);
		expect(other.ok).toBe(true);
		if (other.ok) {
			expect(other.data).toBeNull();
		}
	});

	it("CAS: stale expectedVersion on template update conflicts", async () => {
		const { options } = createMasterDataTestHarness();
		const template = await createItemTemplate(
			{ ...ctx(), code: "CAS", name: "CAS template" },
			options,
		);
		expect(template.ok).toBe(true);
		if (!template.ok) {
			return;
		}
		const conflict = await updateItemTemplate(
			{
				...ctx(),
				id: template.data.id,
				expectedVersion: template.data.version + 1,
				name: "Stale",
			},
			options,
		);
		expect(conflict.ok).toBe(false);
		if (!conflict.ok) {
			expect(conflict.details).toMatchObject({
				reason: "MASTER_VERSION_CONFLICT",
			});
		}
	});
});
