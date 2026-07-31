import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";
import {
	getItemById,
	retireItem,
} from "../src/capabilities/core-organization-masters/item";
import { createItemGroup } from "../src/capabilities/core-organization-masters/item-group";
import {
	activateItemTemplate,
	addItemTemplateAttribute,
	addItemTemplateAttributeOption,
	archiveItemTemplate,
	createItemTemplate,
	createItemVariant,
	getItemVariantById,
	retireItemTemplate,
	retireItemVariant,
	updateItemTemplate,
} from "../src/capabilities/core-organization-masters/item-template-variant";
import {
	getVariantConfiguration,
	listItemTemplateAttributeOptions,
	listItemTemplateAttributes,
	listVariantAttributeValues,
} from "../src/capabilities/extensions";
import { MASTER_DATA_PERMISSION_TEMPLATE_MANAGE } from "../src/permissions";
import { createMasterDataTestHarness } from "./helpers/harness";
import { createGrantingMasterAuthorization } from "./helpers/memory-authorization";
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
	if (!template.ok) {
		throw new Error("template create failed");
	}
	const color = await addItemTemplateAttribute(
		{
			...ctx(organizationId),
			templateId: template.data.id,
			code: "COLOR",
			name: "Color",
			dataType: "single_option",
			isRequired: true,
			isVariantDefining: true,
			displayOrder: 1,
		},
		options,
	);
	if (!color.ok) {
		throw new Error("color attr failed");
	}
	const red = await addItemTemplateAttributeOption(
		{
			...ctx(organizationId),
			attributeId: color.data.id,
			code: "RED",
			label: "Red",
			displayOrder: 1,
		},
		options,
	);
	if (!red.ok) {
		throw new Error("red option failed");
	}
	const blue = await addItemTemplateAttributeOption(
		{
			...ctx(organizationId),
			attributeId: color.data.id,
			code: "BLUE",
			label: "Blue",
			displayOrder: 2,
		},
		options,
	);
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
				dataType: "text",
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
				dataType: "text",
			},
			options,
		);
		expect(dup.ok).toBe(false);
	});

	it("defaults omitted attribute flags to non-required and non-variant-defining", async () => {
		const { options, store, ports } = createMasterDataTestHarness();
		const authorization = createGrantingMasterAuthorization([
			MASTER_DATA_PERMISSION_TEMPLATE_MANAGE,
		]);
		const template = await createItemTemplate(
			{ ...ctx(), code: "DEFAULTS", name: "Defaulted flags" },
			options,
		);
		expect(template.ok).toBe(true);
		if (!template.ok) {
			return;
		}

		const attribute = await addItemTemplateAttribute(
			{
				...ctx(),
				templateId: template.data.id,
				code: "DESCRIPTION",
				name: "Description",
				dataType: "text",
			},
			{ store, ports, authorization },
		);
		expect(attribute.ok).toBe(true);
		if (!attribute.ok) {
			return;
		}
		expect(attribute.data).toMatchObject({
			isRequired: false,
			isVariantDefining: false,
			isSearchable: false,
		});
	});

	it("requires elevated permission only for explicit variant-defining attributes", async () => {
		const { options, store, ports } = createMasterDataTestHarness();
		const authorization = createGrantingMasterAuthorization([
			MASTER_DATA_PERMISSION_TEMPLATE_MANAGE,
		]);
		const template = await createItemTemplate(
			{ ...ctx(), code: "AUTH-ATTR", name: "Attribute auth" },
			options,
		);
		expect(template.ok).toBe(true);
		if (!template.ok) {
			return;
		}

		const denied = await addItemTemplateAttribute(
			{
				...ctx(),
				templateId: template.data.id,
				code: "COLOR",
				name: "Color",
				dataType: "single_option",
				isVariantDefining: true,
			},
			{ store, ports, authorization },
		);
		expect(denied.ok).toBe(false);
	});

	it("allows the same attribute code in different templates and lists deterministically", async () => {
		const { options } = createMasterDataTestHarness();
		const firstTemplate = await createItemTemplate(
			{ ...ctx(), code: "TMP-A", name: "Template A" },
			options,
		);
		const secondTemplate = await createItemTemplate(
			{ ...ctx(), code: "TMP-B", name: "Template B" },
			options,
		);
		expect(firstTemplate.ok).toBe(true);
		expect(secondTemplate.ok).toBe(true);
		if (!(firstTemplate.ok && secondTemplate.ok)) {
			return;
		}

		const first = await addItemTemplateAttribute(
			{
				...ctx(),
				templateId: firstTemplate.data.id,
				code: "COLOR",
				name: "Color",
				dataType: "text",
				displayOrder: 10,
			},
			options,
		);
		const second = await addItemTemplateAttribute(
			{
				...ctx(),
				templateId: secondTemplate.data.id,
				code: "color",
				name: "Color",
				dataType: "text",
			},
			options,
		);
		const size = await addItemTemplateAttribute(
			{
				...ctx(),
				templateId: firstTemplate.data.id,
				code: "SIZE",
				name: "Size",
				dataType: "text",
				displayOrder: 10,
			},
			options,
		);
		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		expect(size.ok).toBe(true);

		const listed = await listItemTemplateAttributes(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				templateId: firstTemplate.data.id,
			},
			options,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) {
			return;
		}
		expect(listed.data.map((attribute) => attribute.normalizedCode)).toEqual([
			"COLOR",
			"SIZE",
		]);
	});

	it("creates enforceable typed variants and keeps md_item as SKU authority", async () => {
		const { options } = createMasterDataTestHarness();
		const template = await createItemTemplate(
			{ ...ctx(), code: "TYPED", name: "Typed template" },
			options,
		);
		expect(template.ok).toBe(true);
		if (!template.ok) {
			return;
		}

		const text = await addItemTemplateAttribute(
			{
				...ctx(),
				templateId: template.data.id,
				code: "TEXT",
				name: "Text",
				dataType: "text",
				isRequired: true,
				validationRules: { minLength: 2, maxLength: 20 },
				displayOrder: 1,
			},
			options,
		);
		const integer = await addItemTemplateAttribute(
			{
				...ctx(),
				templateId: template.data.id,
				code: "COUNT",
				name: "Count",
				dataType: "integer",
				isRequired: true,
				validationRules: { minimum: 1, maximum: 10 },
				displayOrder: 2,
			},
			options,
		);
		const decimal = await addItemTemplateAttribute(
			{
				...ctx(),
				templateId: template.data.id,
				code: "WEIGHT",
				name: "Weight",
				dataType: "decimal",
				isRequired: true,
				validationRules: {
					minimum: "0.1",
					maximum: "99.9",
					precision: 4,
					scale: 1,
				},
				displayOrder: 3,
			},
			options,
		);
		const flag = await addItemTemplateAttribute(
			{
				...ctx(),
				templateId: template.data.id,
				code: "FLAG",
				name: "Flag",
				dataType: "boolean",
				isRequired: true,
				displayOrder: 4,
			},
			options,
		);
		const date = await addItemTemplateAttribute(
			{
				...ctx(),
				templateId: template.data.id,
				code: "INTRO",
				name: "Intro date",
				dataType: "date",
				isRequired: true,
				validationRules: { minimum: "2026-01-01", maximum: "2026-12-31" },
				displayOrder: 5,
			},
			options,
		);
		const single = await addItemTemplateAttribute(
			{
				...ctx(),
				templateId: template.data.id,
				code: "COLOR",
				name: "Color",
				dataType: "single_option",
				isRequired: true,
				isVariantDefining: true,
				displayOrder: 6,
			},
			options,
		);
		const multi = await addItemTemplateAttribute(
			{
				...ctx(),
				templateId: template.data.id,
				code: "CHANNELS",
				name: "Channels",
				dataType: "multiple_option",
				isRequired: true,
				displayOrder: 7,
			},
			options,
		);
		const reference = await addItemTemplateAttribute(
			{
				...ctx(),
				templateId: template.data.id,
				code: "RELATED",
				name: "Related",
				dataType: "reference",
				isRequired: true,
				validationRules: { referenceType: "item" },
				displayOrder: 8,
			},
			options,
		);
		expect(text.ok).toBe(true);
		expect(integer.ok).toBe(true);
		expect(decimal.ok).toBe(true);
		expect(flag.ok).toBe(true);
		expect(date.ok).toBe(true);
		expect(single.ok).toBe(true);
		expect(multi.ok).toBe(true);
		expect(reference.ok).toBe(true);
		if (
			!(
				text.ok &&
				integer.ok &&
				decimal.ok &&
				flag.ok &&
				date.ok &&
				single.ok &&
				multi.ok &&
				reference.ok
			)
		) {
			return;
		}

		const red = await addItemTemplateAttributeOption(
			{
				...ctx(),
				attributeId: single.data.id,
				code: "RED",
				label: "Red",
			},
			options,
		);
		const web = await addItemTemplateAttributeOption(
			{
				...ctx(),
				attributeId: multi.data.id,
				code: "WEB",
				label: "Web",
			},
			options,
		);
		const retail = await addItemTemplateAttributeOption(
			{
				...ctx(),
				attributeId: multi.data.id,
				code: "RETAIL",
				label: "Retail",
			},
			options,
		);
		expect(red.ok).toBe(true);
		expect(web.ok).toBe(true);
		expect(retail.ok).toBe(true);
		if (!(red.ok && web.ok && retail.ok)) {
			return;
		}

		const activated = await activateItemTemplate(
			{
				...ctx(),
				id: template.data.id,
				expectedVersion: template.data.version,
			},
			options,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}
		expect(activated.data.version).toBe(template.data.version + 1);

		const group = await createItemGroup(
			{ ...ctx(), code: "TYPED-GROUP", name: "Typed group" },
			options,
		);
		expect(group.ok).toBe(true);
		if (!group.ok) {
			return;
		}

		const variant = await createItemVariant(
			{
				...ctx(),
				templateId: activated.data.id,
				code: "TYPED-RED",
				name: "Typed red SKU",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: group.data.id,
				attributeValues: [
					{ attributeId: text.data.id, textValue: "Alpha" },
					{ attributeId: integer.data.id, integerValue: 2 },
					{ attributeId: decimal.data.id, decimalValue: "1.0" },
					{ attributeId: flag.data.id, booleanValue: true },
					{ attributeId: date.data.id, dateValue: "2026-06-01" },
					{ attributeId: single.data.id, optionId: red.data.id },
					{
						attributeId: multi.data.id,
						optionIds: [retail.data.id, web.data.id],
					},
					{ attributeId: reference.data.id, referenceValue: "item:RELATED" },
				],
			},
			options,
		);
		expect(variant.ok).toBe(true);
		if (!variant.ok) {
			return;
		}
		expect(variant.data.item.code).toBe("TYPED-RED");
		expect(variant.data.item.status).toBe("draft");
		expect(variant.data.values).toHaveLength(8);
		expect(variant.data.values.map((value) => value.valueType).sort()).toEqual([
			"boolean",
			"date",
			"decimal",
			"integer",
			"multiple_option",
			"reference",
			"single_option",
			"text",
		]);

		const item = await getItemById(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				id: variant.data.itemId,
			},
			options,
		);
		expect(item.ok).toBe(true);
		if (item.ok) {
			expect(item.data?.id).toBe(variant.data.itemId);
			expect(item.data?.code).toBe("TYPED-RED");
		}
	});

	it("rejects options for non-option attributes and missing option parents", async () => {
		const { options } = createMasterDataTestHarness();
		const template = await createItemTemplate(
			{ ...ctx(), code: "OPT-PARENT", name: "Option parent checks" },
			options,
		);
		expect(template.ok).toBe(true);
		if (!template.ok) {
			return;
		}

		const textAttribute = await addItemTemplateAttribute(
			{
				...ctx(),
				templateId: template.data.id,
				code: "DESCRIPTION",
				name: "Description",
				dataType: "text",
			},
			options,
		);
		expect(textAttribute.ok).toBe(true);
		if (!textAttribute.ok) {
			return;
		}

		const addToText = await addItemTemplateAttributeOption(
			{
				...ctx(),
				attributeId: textAttribute.data.id,
				code: "RED",
				label: "Red",
			},
			options,
		);
		expect(addToText.ok).toBe(false);

		const listTextOptions = await listItemTemplateAttributeOptions(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				attributeId: textAttribute.data.id,
			},
			options,
		);
		expect(listTextOptions.ok).toBe(false);

		const missing = await listItemTemplateAttributeOptions(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				attributeId: randomUUID(),
			},
			options,
		);
		expect(missing.ok).toBe(false);
	});

	it("rejects adding options after template activation", async () => {
		const { options } = createMasterDataTestHarness();
		const seeded = await seedActiveTemplate(options);

		const added = await addItemTemplateAttributeOption(
			{
				...ctx(),
				attributeId: seeded.color.id,
				code: "GREEN",
				label: "Green",
			},
			options,
		);
		expect(added.ok).toBe(false);
	});

	it("scopes option-code uniqueness by attribute and lists deterministically", async () => {
		const { options } = createMasterDataTestHarness();
		const template = await createItemTemplate(
			{ ...ctx(), code: "OPT-CODES", name: "Option code scope" },
			options,
		);
		expect(template.ok).toBe(true);
		if (!template.ok) {
			return;
		}

		const color = await addItemTemplateAttribute(
			{
				...ctx(),
				templateId: template.data.id,
				code: "COLOR",
				name: "Color",
				dataType: "single_option",
				isVariantDefining: true,
			},
			options,
		);
		const finish = await addItemTemplateAttribute(
			{
				...ctx(),
				templateId: template.data.id,
				code: "FINISH",
				name: "Finish",
				dataType: "single_option",
			},
			options,
		);
		expect(color.ok).toBe(true);
		expect(finish.ok).toBe(true);
		if (!(color.ok && finish.ok)) {
			return;
		}

		const blue = await addItemTemplateAttributeOption(
			{
				...ctx(),
				attributeId: color.data.id,
				code: "BLUE",
				label: "Blue",
				displayOrder: 10,
			},
			options,
		);
		const amber = await addItemTemplateAttributeOption(
			{
				...ctx(),
				attributeId: color.data.id,
				code: "AMBER",
				label: "Amber",
				displayOrder: 10,
			},
			options,
		);
		const duplicate = await addItemTemplateAttributeOption(
			{
				...ctx(),
				attributeId: color.data.id,
				code: "blue",
				label: "Blue again",
			},
			options,
		);
		const sameCodeOtherAttribute = await addItemTemplateAttributeOption(
			{
				...ctx(),
				attributeId: finish.data.id,
				code: "BLUE",
				label: "Blue finish",
			},
			options,
		);
		expect(blue.ok).toBe(true);
		expect(amber.ok).toBe(true);
		expect(duplicate.ok).toBe(false);
		expect(sameCodeOtherAttribute.ok).toBe(true);

		const listed = await listItemTemplateAttributeOptions(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				attributeId: color.data.id,
			},
			options,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) {
			return;
		}
		expect(listed.data.map((option) => option.normalizedCode)).toEqual([
			"AMBER",
			"BLUE",
		]);
	});

	it("store rejects activation when an option attribute has no options", async () => {
		const { options, store, ports } = createMasterDataTestHarness();
		const template = await createItemTemplate(
			{ ...ctx(), code: "NO-OPTIONS", name: "Incomplete template" },
			options,
		);
		expect(template.ok).toBe(true);
		if (!template.ok) {
			return;
		}
		const attribute = await addItemTemplateAttribute(
			{
				...ctx(),
				templateId: template.data.id,
				code: "COLOR",
				name: "Color",
				dataType: "single_option",
				isVariantDefining: true,
			},
			options,
		);
		expect(attribute.ok).toBe(true);
		const activated = await store.transitionItemTemplate(
			{
				organizationId: "org-a",
				id: template.data.id,
				expectedVersion: template.data.version,
				actorUserId: "user-1",
				toStatus: "active",
			},
			ports,
			{ correlationId: randomUUID(), eventSuffix: "activated" },
		);
		expect(activated.ok).toBe(false);
	});

	it("rejects adding attributes to an active template with template state details", async () => {
		const { options } = createMasterDataTestHarness();
		const seeded = await seedActiveTemplate(options);

		const added = await addItemTemplateAttribute(
			{
				...ctx(),
				templateId: seeded.template.id,
				code: "MATERIAL",
				name: "Material",
				dataType: "text",
			},
			options,
		);
		expect(added.ok).toBe(false);
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
	});

	it("rejects duplicate values for the same template attribute", async () => {
		const { options } = createMasterDataTestHarness();
		const seeded = await seedActiveTemplate(options);
		const duplicate = await createItemVariant(
			{
				...ctx(),
				templateId: seeded.template.id,
				code: "TEE-DUP-ATTR",
				name: "Duplicate attribute",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: seeded.group.id,
				attributeValues: [
					{ attributeId: seeded.color.id, optionId: seeded.red.id },
					{ attributeId: seeded.color.id, optionId: seeded.blue.id },
				],
			},
			options,
		);
		expect(duplicate.ok).toBe(false);
	});

	it("blocks template retirement while a live variant exists", async () => {
		const { options } = createMasterDataTestHarness();
		const seeded = await seedActiveTemplate(options);
		const variant = await createItemVariant(
			{
				...ctx(),
				templateId: seeded.template.id,
				code: "TEE-LIVE",
				name: "Live tee",
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
		const retired = await retireItemTemplate(
			{
				...ctx(),
				id: seeded.template.id,
				expectedVersion: seeded.template.version,
			},
			options,
		);
		expect(retired.ok).toBe(false);
	});

	it("exposes archiveItemTemplate as the archive intent for retired templates", async () => {
		const { options } = createMasterDataTestHarness();
		const template = await createItemTemplate(
			{ ...ctx(), code: "ARCHIVE-TPL", name: "Archive template" },
			options,
		);
		expect(template.ok).toBe(true);
		if (!template.ok) {
			return;
		}

		const archived = await archiveItemTemplate(
			{
				...ctx(),
				id: template.data.id,
				expectedVersion: template.data.version,
			},
			options,
		);
		expect(archived.ok).toBe(true);
		if (archived.ok) {
			expect(archived.data.status).toBe("retired");
		}
	});

	it("rejects archived options for new variants while historical assignments remain readable", async () => {
		const { options, store } = createMasterDataTestHarness();
		const seeded = await seedActiveTemplate(options);
		const first = await createItemVariant(
			{
				...ctx(),
				templateId: seeded.template.id,
				code: "TEE-HIST-RED",
				name: "Historical red",
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
		if (!first.ok) {
			return;
		}

		const archived = store.archiveItemTemplateAttributeOptionForTest(
			"org-a",
			seeded.red.id,
			"user-1",
		);
		expect(archived.ok).toBe(true);

		const historical = await getItemVariantById(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				id: first.data.id,
			},
			options,
		);
		expect(historical.ok).toBe(true);
		if (historical.ok && historical.data !== null) {
			expect(historical.data.values[0]?.optionId).toBe(seeded.red.id);
		}

		const next = await createItemVariant(
			{
				...ctx(),
				templateId: seeded.template.id,
				code: "TEE-ARCHIVED-RED",
				name: "Archived red",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: seeded.group.id,
				attributeValues: [
					{ attributeId: seeded.color.id, optionId: seeded.red.id },
				],
			},
			options,
		);
		expect(next.ok).toBe(false);
	});

	it("retires variant via retireItemVariant and keeps it resolvable", async () => {
		const { options } = createMasterDataTestHarness();
		const seeded = await seedActiveTemplate(options);
		const variant = await createItemVariant(
			{
				...ctx(),
				templateId: seeded.template.id,
				code: "TEE-RV",
				name: "Tee retire cmd",
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
		const retired = await retireItemVariant(
			{
				...ctx(),
				id: variant.data.id,
				expectedVersion: variant.data.version,
			},
			options,
		);
		expect(retired.ok).toBe(true);
		if (!retired.ok) {
			return;
		}
		expect(retired.data.retiredAt).not.toBeNull();
		expect(retired.data.item.status).toBe("retired");
	});

	it("rejects stale variant membership version before retiring its item", async () => {
		const { options, store, ports } = createMasterDataTestHarness();
		const seeded = await seedActiveTemplate(options);
		const variant = await createItemVariant(
			{
				...ctx(),
				templateId: seeded.template.id,
				code: "TEE-STALE",
				name: "Stale tee",
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
		const stale = await store.retireItemVariant(
			{
				organizationId: "org-a",
				variantId: variant.data.id,
				expectedVariantVersion: variant.data.version + 1,
				itemId: variant.data.itemId,
				expectedItemVersion: variant.data.item.version,
				actorUserId: "user-1",
			},
			ports,
			{ correlationId: randomUUID() },
		);
		expect(stale.ok).toBe(false);
		const current = await store.getItemVariantById("org-a", variant.data.id);
		expect(current.ok).toBe(true);
		if (current.ok && current.data !== null) {
			expect(current.data.retiredAt).toBeNull();
			expect(current.data.item.status).not.toBe("retired");
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

	it("returns typed attribute values and full configuration through separate queries", async () => {
		const { options } = createMasterDataTestHarness();
		const seeded = await seedActiveTemplate(options);
		const variant = await createItemVariant(
			{
				...ctx(),
				templateId: seeded.template.id,
				code: "TEE-CONFIG",
				name: "Tee config",
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

		const values = await listVariantAttributeValues(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				id: variant.data.id,
			},
			options,
		);
		expect(values.ok).toBe(true);
		if (!values.ok) {
			return;
		}
		expect(values.data).toEqual(variant.data.values);

		const configuration = await getVariantConfiguration(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				id: variant.data.id,
			},
			options,
		);
		expect(configuration.ok).toBe(true);
		if (!configuration.ok) {
			return;
		}
		expect(configuration.data).toMatchObject({
			id: variant.data.id,
			itemId: variant.data.itemId,
			templateId: variant.data.templateId,
		});
		expect(configuration.data.values).toEqual(variant.data.values);
	});

	it("returns not-found for missing variant attribute values and configuration", async () => {
		const { options } = createMasterDataTestHarness();
		const missingId = randomUUID();

		const values = await listVariantAttributeValues(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				id: missingId,
			},
			options,
		);
		expect(values.ok).toBe(false);

		const configuration = await getVariantConfiguration(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				id: missingId,
			},
			options,
		);
		expect(configuration.ok).toBe(false);
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
	});
});
