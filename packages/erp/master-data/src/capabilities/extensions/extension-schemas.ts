import { z } from "zod";

import {
	itemIdSchema,
	partyAddressIdSchema,
	partyContactIdSchema,
	partyIdSchema,
	partyRoleIdSchema,
	warehouseIdSchema,
} from "../../brands";
import {
	expectedVersionSchema,
	orgActorContextSchema,
	orgQueryActorSchema,
} from "../../contracts/context";
import {
	EXTERNAL_ID_CASE_SENSITIVITIES,
	PARTY_ADDRESS_PURPOSES,
	PARTY_ADDRESS_TYPES,
	PARTY_ADDRESS_VALIDATION_STATUSES,
	PARTY_CONTACT_TYPES,
	PARTY_CONTACT_VERIFICATION_STATUSES,
	PARTY_RELATIONSHIP_TYPES,
	PARTY_ROLE_CODES,
} from "../../types";
import {
	refCountryIdSchema,
	refLanguageIdSchema,
	refUomIdSchema,
} from "../platform-references/brands";
import { MAX_EXTENSION_TRANSITION_REASON_LENGTH } from "./extension-lifecycle";
import {
	ITEM_ALIAS_TYPES,
	MAX_ITEM_ALIAS_SOURCE_LENGTH,
	MAX_ITEM_ALIAS_VALUE_LENGTH,
} from "./item-alias-policy";
import {
	ITEM_BARCODE_SYMBOLOGIES,
	MAX_ITEM_BARCODE_VALUE_LENGTH,
} from "./item-barcode-policy";
import {
	ITEM_UOM_COMPATIBILITY_MODES,
	ITEM_UOM_FACTOR_SCALE,
} from "./item-uom-policy";

export {
	addItemTemplateAttributeInputSchema,
	addItemTemplateAttributeOptionInputSchema,
	getItemVariantByIdInputSchema,
	listItemTemplateAttributeOptionsInputSchema,
	listItemTemplateAttributesInputSchema,
} from "../core-organization-masters/schemas";

const systemSchema = z.string().trim().min(1).max(64);
const externalIdTypeSchema = z
	.string()
	.trim()
	.toLowerCase()
	.min(1)
	.max(64)
	.regex(/^[a-z0-9._-]+$/);
const externalIdValueSchema = z.string().trim().min(1).max(256);
const warehouseExternalIdValueSchema = z.string().trim().min(1).max(128);
const contactPurposeSchema = z
	.string()
	.trim()
	.toLowerCase()
	.min(1)
	.max(64)
	.regex(/^[a-z0-9._-]+$/);
const extensionPageSchema = z.number().int().positive().default(1);
const extensionPageSizeSchema = z
	.number()
	.int()
	.positive()
	.max(100)
	.default(25);
const lifecycleReasonSchema = z
	.string()
	.trim()
	.min(1)
	.max(MAX_EXTENSION_TRANSITION_REASON_LENGTH)
	.optional();
const optionalEffectiveDateSchema = z.coerce.date().optional();
const nullableEffectiveDatePatchSchema = z.coerce.date().nullable().optional();

type NullableDateRange = {
	effectiveFrom?: Date | null;
	effectiveTo?: Date | null;
};

function validateSuppliedEffectiveRange(
	input: NullableDateRange,
	context: z.RefinementCtx,
): void {
	if (
		input.effectiveFrom !== undefined &&
		input.effectiveFrom !== null &&
		input.effectiveTo !== undefined &&
		input.effectiveTo !== null &&
		input.effectiveFrom > input.effectiveTo
	) {
		context.addIssue({
			code: "custom",
			message: "effectiveTo must be on or after effectiveFrom",
			path: ["effectiveTo"],
		});
	}
}

function hasDefinedMutation(
	input: Record<string, unknown>,
	fields: readonly string[],
): boolean {
	return fields.some((field) => input[field] !== undefined);
}

function createListByParentInputSchema<ParentSchema extends z.ZodTypeAny>(
	parentSchema: ParentSchema,
) {
	return orgQueryActorSchema.extend({
		parentId: parentSchema,
		page: extensionPageSchema,
		pageSize: extensionPageSizeSchema,
	});
}

export const createPartyRoleInputSchema = orgActorContextSchema
	.extend({
		partyId: partyIdSchema,
		roleCode: z.enum(PARTY_ROLE_CODES),
		validFrom: optionalEffectiveDateSchema,
		validTo: optionalEffectiveDateSchema,
	})
	.superRefine((input, context) => {
		validateSuppliedEffectiveRange(
			{ effectiveFrom: input.validFrom, effectiveTo: input.validTo },
			context,
		);
	});

export const partyRoleLifecycleInputSchema = orgActorContextSchema.extend({
	id: partyRoleIdSchema,
	expectedVersion: expectedVersionSchema,
	reason: lifecycleReasonSchema,
});

export const updatePartyRoleInputSchema = orgActorContextSchema
	.extend({
		id: partyRoleIdSchema,
		expectedVersion: expectedVersionSchema,
		roleCode: z.enum(PARTY_ROLE_CODES).optional(),
		validFrom: nullableEffectiveDatePatchSchema,
		validTo: nullableEffectiveDatePatchSchema,
	})
	.superRefine((input, context) => {
		validateSuppliedEffectiveRange(
			{ effectiveFrom: input.validFrom, effectiveTo: input.validTo },
			context,
		);
		if (!hasDefinedMutation(input, ["roleCode", "validFrom", "validTo"])) {
			context.addIssue({
				code: "custom",
				message: "At least one party role field must be updated",
				path: [],
			});
		}
	});

export const getPartyRoleInputSchema = orgQueryActorSchema.extend({
	partyId: partyIdSchema,
	id: partyRoleIdSchema,
});

export const createPartyAddressInputSchema = orgActorContextSchema
	.extend({
		partyId: partyIdSchema,
		addressType: z.enum(PARTY_ADDRESS_TYPES),
		purpose: z.enum(PARTY_ADDRESS_PURPOSES),
		line1: z.string().trim().min(1).max(200),
		line2: z.string().trim().max(200).optional(),
		line3: z.string().trim().max(200).optional(),
		city: z.string().trim().min(1).max(100),
		administrativeArea: z.string().trim().max(100).optional(),
		postalCode: z.string().trim().max(32).optional(),
		countryId: refCountryIdSchema,
		attention: z.string().trim().max(200).optional(),
		isPrimary: z.boolean().optional(),
		validationStatus: z.enum(PARTY_ADDRESS_VALIDATION_STATUSES).optional(),
		effectiveFrom: optionalEffectiveDateSchema,
		effectiveTo: optionalEffectiveDateSchema,
	})
	.superRefine(validateSuppliedEffectiveRange);

export const updatePartyAddressInputSchema = orgActorContextSchema
	.extend({
		id: partyAddressIdSchema,
		expectedVersion: expectedVersionSchema,
		addressType: z.enum(PARTY_ADDRESS_TYPES).optional(),
		purpose: z.enum(PARTY_ADDRESS_PURPOSES).optional(),
		line1: z.string().trim().min(1).max(200).optional(),
		line2: z.string().trim().max(200).nullable().optional(),
		line3: z.string().trim().max(200).nullable().optional(),
		city: z.string().trim().min(1).max(100).optional(),
		administrativeArea: z.string().trim().max(100).nullable().optional(),
		postalCode: z.string().trim().max(32).nullable().optional(),
		countryId: refCountryIdSchema.optional(),
		attention: z.string().trim().max(200).nullable().optional(),
		isPrimary: z.boolean().optional(),
		validationStatus: z.enum(PARTY_ADDRESS_VALIDATION_STATUSES).optional(),
		effectiveFrom: nullableEffectiveDatePatchSchema,
		effectiveTo: nullableEffectiveDatePatchSchema,
	})
	.superRefine((input, context) => {
		validateSuppliedEffectiveRange(input, context);
		if (
			!hasDefinedMutation(input, [
				"addressType",
				"purpose",
				"line1",
				"line2",
				"line3",
				"city",
				"administrativeArea",
				"postalCode",
				"countryId",
				"attention",
				"isPrimary",
				"validationStatus",
				"effectiveFrom",
				"effectiveTo",
			])
		) {
			context.addIssue({
				code: "custom",
				message: "At least one address field must be updated",
				path: [],
			});
		}
	});

export const getPartyAddressInputSchema = orgQueryActorSchema.extend({
	partyId: partyIdSchema,
	id: partyAddressIdSchema,
});

export const createPartyContactInputSchema = orgActorContextSchema
	.extend({
		partyId: partyIdSchema,
		contactType: z.enum(PARTY_CONTACT_TYPES),
		value: z.string().trim().min(1).max(500),
		label: z.string().trim().min(1).max(100).optional(),
		purpose: contactPurposeSchema.optional(),
		isPrimary: z.boolean().optional(),
		effectiveFrom: optionalEffectiveDateSchema,
		effectiveTo: optionalEffectiveDateSchema,
	})
	.superRefine(validateSuppliedEffectiveRange);

export const updatePartyContactInputSchema = orgActorContextSchema
	.extend({
		id: partyContactIdSchema,
		expectedVersion: expectedVersionSchema,
		contactType: z.enum(PARTY_CONTACT_TYPES).optional(),
		value: z.string().trim().min(1).max(500).optional(),
		label: z.string().trim().min(1).max(100).nullable().optional(),
		purpose: contactPurposeSchema.nullable().optional(),
		isPrimary: z.boolean().optional(),
		effectiveFrom: nullableEffectiveDatePatchSchema,
		effectiveTo: nullableEffectiveDatePatchSchema,
	})
	.superRefine((input, context) => {
		validateSuppliedEffectiveRange(input, context);
		if ((input.contactType === undefined) !== (input.value === undefined)) {
			context.addIssue({
				code: "custom",
				message: "contactType and value must be updated together",
				path: ["value"],
			});
		}
		if (
			!hasDefinedMutation(input, [
				"contactType",
				"value",
				"label",
				"purpose",
				"isPrimary",
				"effectiveFrom",
				"effectiveTo",
			])
		) {
			context.addIssue({
				code: "custom",
				message: "At least one contact field must be updated",
				path: [],
			});
		}
	});

export const updatePartyContactVerificationInputSchema =
	orgActorContextSchema.extend({
		id: partyContactIdSchema,
		expectedVersion: expectedVersionSchema,
		verificationStatus: z.enum(PARTY_CONTACT_VERIFICATION_STATUSES),
	});

export const createPartyExternalIdInputSchema = orgActorContextSchema.extend({
	partyId: partyIdSchema,
	sourceSystem: systemSchema,
	externalIdType: externalIdTypeSchema,
	externalValue: externalIdValueSchema,
	caseSensitivity: z.enum(EXTERNAL_ID_CASE_SENSITIVITIES),
	isPrimary: z.boolean().default(false),
});

export const createPartyRelationshipInputSchema = orgActorContextSchema
	.extend({
		sourcePartyId: partyIdSchema,
		targetPartyId: partyIdSchema,
		relationshipType: z.enum(PARTY_RELATIONSHIP_TYPES),
		effectiveFrom: optionalEffectiveDateSchema,
		effectiveTo: optionalEffectiveDateSchema,
	})
	.superRefine(validateSuppliedEffectiveRange);

export const createItemUomInputSchema = orgActorContextSchema
	.extend({
		itemId: itemIdSchema,
		alternateUomId: refUomIdSchema,
		conversionFactor: z.string().trim().min(1).max(40),
		roundingScale: z
			.number()
			.int()
			.min(0)
			.max(ITEM_UOM_FACTOR_SCALE)
			.default(0),
		isPurchaseUom: z.boolean().default(false),
		isSalesUom: z.boolean().default(false),
		isInventoryUom: z.boolean().default(false),
		isDefaultPurchaseUom: z.boolean().default(false),
		isDefaultSalesUom: z.boolean().default(false),
		compatibilityMode: z
			.enum(ITEM_UOM_COMPATIBILITY_MODES)
			.default("physical_dimension"),
		packagingApprovalReference: z.string().trim().min(1).max(128).optional(),
	})
	.superRefine((input, context) => {
		if (input.isDefaultPurchaseUom && !input.isPurchaseUom) {
			context.addIssue({
				code: "custom",
				message: "A default purchase UoM must be enabled for purchasing",
				path: ["isDefaultPurchaseUom"],
			});
		}
		if (input.isDefaultSalesUom && !input.isSalesUom) {
			context.addIssue({
				code: "custom",
				message: "A default sales UoM must be enabled for sales",
				path: ["isDefaultSalesUom"],
			});
		}
		if (
			input.compatibilityMode === "packaging_count" &&
			input.packagingApprovalReference === undefined
		) {
			context.addIssue({
				code: "custom",
				message: "Packaging/count compatibility requires an approval reference",
				path: ["packagingApprovalReference"],
			});
		}
	});

export const createItemBarcodeInputSchema = orgActorContextSchema
	.extend({
		itemId: itemIdSchema,
		barcodeValue: z.string().trim().min(1).max(MAX_ITEM_BARCODE_VALUE_LENGTH),
		symbology: z.enum(ITEM_BARCODE_SYMBOLOGIES),
		uomId: refUomIdSchema.optional(),
		packQuantity: z.string().trim().min(1).max(64).optional(),
		isPrimary: z.boolean().optional(),
	})
	.superRefine((input, context) => {
		if ((input.uomId === undefined) !== (input.packQuantity === undefined)) {
			context.addIssue({
				code: "custom",
				message: "uomId and packQuantity must be provided together",
				path: input.uomId === undefined ? ["uomId"] : ["packQuantity"],
			});
		}
	});

export const findItemByBarcodeInputSchema = orgQueryActorSchema.extend({
	barcodeValue: z.string().trim().min(1).max(MAX_ITEM_BARCODE_VALUE_LENGTH),
	symbology: z.enum(ITEM_BARCODE_SYMBOLOGIES),
	includeArchived: z.boolean().optional(),
});

export const createItemExternalIdInputSchema = orgActorContextSchema.extend({
	itemId: itemIdSchema,
	sourceSystem: systemSchema,
	externalIdType: externalIdTypeSchema,
	externalValue: externalIdValueSchema,
	caseSensitivity: z.enum(EXTERNAL_ID_CASE_SENSITIVITIES),
	isPrimary: z.boolean().default(false),
});

export const createItemAliasInputSchema = orgActorContextSchema.extend({
	itemId: itemIdSchema,
	aliasType: z.enum(ITEM_ALIAS_TYPES),
	aliasValue: z.string().trim().min(1).max(MAX_ITEM_ALIAS_VALUE_LENGTH),
	languageId: refLanguageIdSchema.optional(),
	source: z.string().trim().min(1).max(MAX_ITEM_ALIAS_SOURCE_LENGTH),
	isSearchable: z.boolean().default(true),
});

export const createWarehouseExternalIdInputSchema =
	orgActorContextSchema.extend({
		warehouseId: warehouseIdSchema,
		sourceSystem: systemSchema,
		externalIdType: externalIdTypeSchema,
		externalValue: warehouseExternalIdValueSchema,
		caseSensitivity: z.enum(EXTERNAL_ID_CASE_SENSITIVITIES),
	});

export const findPartyByExternalIdInputSchema = orgQueryActorSchema.extend({
	sourceSystem: systemSchema,
	externalIdType: externalIdTypeSchema,
	externalValue: externalIdValueSchema,
	caseSensitivity: z.enum(EXTERNAL_ID_CASE_SENSITIVITIES),
});

/** @deprecated Use a domain-specific find*ByExternalIdInputSchema. */
export const findByExternalIdInputSchema = findPartyByExternalIdInputSchema;

export const findWarehouseByExternalIdInputSchema = orgQueryActorSchema.extend({
	sourceSystem: systemSchema,
	externalIdType: externalIdTypeSchema,
	externalValue: warehouseExternalIdValueSchema,
	caseSensitivity: z.enum(EXTERNAL_ID_CASE_SENSITIVITIES),
});

export const findItemByExternalIdInputSchema = orgQueryActorSchema.extend({
	sourceSystem: systemSchema,
	externalIdType: externalIdTypeSchema,
	externalValue: externalIdValueSchema,
	caseSensitivity: z.enum(EXTERNAL_ID_CASE_SENSITIVITIES),
});

export const findItemByAliasInputSchema = orgQueryActorSchema.extend({
	aliasValue: z.string().trim().min(1).max(MAX_ITEM_ALIAS_VALUE_LENGTH),
	aliasType: z.enum(ITEM_ALIAS_TYPES).optional(),
	languageId: refLanguageIdSchema.optional(),
});

export const listItemUomsInputSchema = orgQueryActorSchema.extend({
	itemId: itemIdSchema,
	page: extensionPageSchema,
	pageSize: extensionPageSizeSchema,
});

export const listPartyRolesInputSchema = orgQueryActorSchema.extend({
	partyId: partyIdSchema,
	page: extensionPageSchema,
	pageSize: extensionPageSizeSchema,
});

export const listItemAliasesInputSchema = orgQueryActorSchema.extend({
	itemId: itemIdSchema,
	page: extensionPageSchema,
	pageSize: extensionPageSizeSchema,
});

export const listPartyRelationshipsInputSchema = orgQueryActorSchema.extend({
	partyId: partyIdSchema,
	page: extensionPageSchema,
	pageSize: extensionPageSizeSchema,
});

export const listItemsByAliasInputSchema = findItemByAliasInputSchema.extend({
	page: extensionPageSchema,
	pageSize: extensionPageSizeSchema,
});

export const listPartyExtensionsInputSchema =
	createListByParentInputSchema(partyIdSchema);
export const listItemExtensionsInputSchema =
	createListByParentInputSchema(itemIdSchema);
export const listWarehouseExtensionsInputSchema =
	createListByParentInputSchema(warehouseIdSchema);
/** @deprecated Use a domain-specific list*ExtensionsInputSchema. */
export const listByParentInputSchema = orgQueryActorSchema.extend({
	parentId: z.string().uuid(),
	page: extensionPageSchema,
	pageSize: extensionPageSizeSchema,
});

export const getPrimaryPartyAddressInputSchema = orgQueryActorSchema.extend({
	partyId: partyIdSchema,
	purpose: z.enum(PARTY_ADDRESS_PURPOSES),
});

export const getPrimaryPartyContactInputSchema = orgQueryActorSchema.extend({
	partyId: partyIdSchema,
	contactType: z.enum(PARTY_CONTACT_TYPES),
	purpose: contactPurposeSchema.nullable().optional(),
});

export const getDefaultItemUomInputSchema = orgQueryActorSchema.extend({
	itemId: itemIdSchema,
});

export type CreatePartyRoleInput = z.infer<typeof createPartyRoleInputSchema>;
export type PartyRoleLifecycleInput = z.infer<
	typeof partyRoleLifecycleInputSchema
>;
export type UpdatePartyRoleInput = z.infer<typeof updatePartyRoleInputSchema>;
export type GetPartyRoleInput = z.infer<typeof getPartyRoleInputSchema>;
export type ListPartyRolesInput = z.infer<typeof listPartyRolesInputSchema>;
export type CreatePartyAddressInput = z.infer<
	typeof createPartyAddressInputSchema
>;
export type UpdatePartyAddressInput = z.infer<
	typeof updatePartyAddressInputSchema
>;
export type GetPartyAddressInput = z.infer<typeof getPartyAddressInputSchema>;
export type CreatePartyContactInput = z.infer<
	typeof createPartyContactInputSchema
>;
export type UpdatePartyContactInput = z.infer<
	typeof updatePartyContactInputSchema
>;
export type UpdatePartyContactVerificationInput = z.infer<
	typeof updatePartyContactVerificationInputSchema
>;
export type CreatePartyExternalIdInput = z.infer<
	typeof createPartyExternalIdInputSchema
>;
export type CreatePartyRelationshipInput = z.infer<
	typeof createPartyRelationshipInputSchema
>;
export type CreateItemUomInput = z.infer<typeof createItemUomInputSchema>;
export type CreateItemBarcodeInput = z.infer<
	typeof createItemBarcodeInputSchema
>;
export type FindItemByBarcodeInput = z.infer<
	typeof findItemByBarcodeInputSchema
>;
export type CreateItemExternalIdInput = z.infer<
	typeof createItemExternalIdInputSchema
>;
export type CreateItemAliasInput = z.infer<typeof createItemAliasInputSchema>;
export type CreateWarehouseExternalIdInput = z.infer<
	typeof createWarehouseExternalIdInputSchema
>;
export type FindPartyByExternalIdInput = z.infer<
	typeof findPartyByExternalIdInputSchema
>;
export type FindWarehouseByExternalIdInput = z.infer<
	typeof findWarehouseByExternalIdInputSchema
>;
export type FindItemByExternalIdInput = z.infer<
	typeof findItemByExternalIdInputSchema
>;
export type FindItemByAliasInput = z.infer<typeof findItemByAliasInputSchema>;
export type ListItemUomsInput = z.infer<typeof listItemUomsInputSchema>;
export type ListItemAliasesInput = z.infer<typeof listItemAliasesInputSchema>;
export type ListPartyRelationshipsInput = z.infer<
	typeof listPartyRelationshipsInputSchema
>;
export type ListItemsByAliasInput = z.infer<typeof listItemsByAliasInputSchema>;
export type ListByParentInput = z.infer<typeof listByParentInputSchema>;
export type ListPartyExtensionsInput = z.infer<
	typeof listPartyExtensionsInputSchema
>;
export type ListItemExtensionsInput = z.infer<
	typeof listItemExtensionsInputSchema
>;
export type ListWarehouseExtensionsInput = z.infer<
	typeof listWarehouseExtensionsInputSchema
>;
export type GetPrimaryPartyAddressInput = z.infer<
	typeof getPrimaryPartyAddressInputSchema
>;
export type GetPrimaryPartyContactInput = z.infer<
	typeof getPrimaryPartyContactInputSchema
>;
export type GetDefaultItemUomInput = z.infer<
	typeof getDefaultItemUomInputSchema
>;
