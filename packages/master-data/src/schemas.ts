import { z } from "zod";
import {
	changeRequestIdSchema,
	itemGroupIdSchema,
	itemIdSchema,
	itemTemplateAttributeIdSchema,
	itemTemplateAttributeOptionIdSchema,
	itemTemplateIdSchema,
	itemVariantIdSchema,
	partyIdSchema,
	paymentTermIdSchema,
	refCountryIdSchema,
	refCurrencyIdSchema,
	refLanguageIdSchema,
	refUomIdSchema,
	taxRegistrationIdSchema,
	warehouseIdSchema,
} from "./brands";
import {
	orgActorContextSchema,
	orgQueryActorSchema,
} from "./contracts/context";
import {
	DEFAULT_MASTER_PAGE,
	DEFAULT_MASTER_PAGE_SIZE,
	MAX_MASTER_PAGE_SIZE,
	type masterListOptionsSchema,
} from "./contracts/pagination";
import {
	ITEM_TEMPLATE_ATTRIBUTE_VALUE_KINDS,
	ITEM_TYPES,
	PARTY_KINDS,
	TAX_REGISTRATION_TYPES,
	WAREHOUSE_LOCATION_TYPES,
} from "./types";

export { orgActorContextSchema } from "./contracts/context";
export {
	DEFAULT_MASTER_PAGE,
	DEFAULT_MASTER_PAGE_SIZE,
	MAX_MASTER_PAGE_SIZE,
	masterListOptionsSchema,
} from "./contracts/pagination";

const nameSchema = z.string().trim().min(1).max(200);
const codeInputSchema = z.string().trim().min(1).max(64);

/**
 * Party create — no customer/supplier booleans.
 * Activation requires ≥1 active `md_party_role`.
 */
export const createPartyInputSchema = orgActorContextSchema.extend({
	code: codeInputSchema,
	name: nameSchema,
	partyKind: z.enum(PARTY_KINDS),
	legalName: z.string().trim().min(1).max(200).optional(),
	tradingName: z.string().trim().min(1).max(200).optional(),
	registrationNumber: z.string().trim().min(1).max(64).optional(),
	registrationCountryId: refCountryIdSchema.optional(),
	preferredLanguageId: refLanguageIdSchema.optional(),
	defaultCurrencyId: refCurrencyIdSchema.optional(),
});

export const updatePartyInputSchema = orgActorContextSchema.extend({
	id: partyIdSchema,
	expectedVersion: z.number().int().positive(),
	name: nameSchema.optional(),
	legalName: z.string().trim().min(1).max(200).nullable().optional(),
	tradingName: z.string().trim().min(1).max(200).nullable().optional(),
	registrationNumber: z.string().trim().min(1).max(64).nullable().optional(),
	registrationCountryId: refCountryIdSchema.nullable().optional(),
	preferredLanguageId: refLanguageIdSchema.nullable().optional(),
	defaultCurrencyId: refCurrencyIdSchema.nullable().optional(),
});

export const partyLifecycleInputSchema = orgActorContextSchema.extend({
	id: partyIdSchema,
	expectedVersion: z.number().int().positive(),
});

/** Activate requires an approved MDG change request (R2). */
export const activatePartyInputSchema = partyLifecycleInputSchema.extend({
	changeRequestId: changeRequestIdSchema.optional(),
});

export const createItemGroupInputSchema = orgActorContextSchema.extend({
	code: codeInputSchema,
	name: nameSchema,
	parentId: itemGroupIdSchema.optional(),
});

export const updateItemGroupInputSchema = orgActorContextSchema.extend({
	id: itemGroupIdSchema,
	expectedVersion: z.number().int().positive(),
	name: nameSchema.optional(),
	parentId: itemGroupIdSchema.nullable().optional(),
});

export const itemGroupLifecycleInputSchema = orgActorContextSchema.extend({
	id: itemGroupIdSchema,
	expectedVersion: z.number().int().positive(),
});

export const createItemInputSchema = orgActorContextSchema.extend({
	code: codeInputSchema,
	name: nameSchema,
	itemType: z.enum(ITEM_TYPES),
	baseUomId: refUomIdSchema,
	itemGroupId: itemGroupIdSchema,
});

export const updateItemInputSchema = orgActorContextSchema.extend({
	id: itemIdSchema,
	expectedVersion: z.number().int().positive(),
	name: nameSchema.optional(),
	itemType: z.enum(ITEM_TYPES).optional(),
	baseUomId: refUomIdSchema.optional(),
	itemGroupId: itemGroupIdSchema.optional(),
});

export const itemLifecycleInputSchema = orgActorContextSchema.extend({
	id: itemIdSchema,
	expectedVersion: z.number().int().positive(),
});

export const createWarehouseInputSchema = orgActorContextSchema.extend({
	code: codeInputSchema,
	name: nameSchema,
	locationType: z.enum(WAREHOUSE_LOCATION_TYPES),
	parentId: warehouseIdSchema.optional(),
});

export const updateWarehouseInputSchema = orgActorContextSchema.extend({
	id: warehouseIdSchema,
	expectedVersion: z.number().int().positive(),
	name: nameSchema.optional(),
	locationType: z.enum(WAREHOUSE_LOCATION_TYPES).optional(),
});

export const moveWarehouseInputSchema = orgActorContextSchema.extend({
	id: warehouseIdSchema,
	expectedVersion: z.number().int().positive(),
	parentId: warehouseIdSchema.nullable(),
});

export const warehouseLifecycleInputSchema = orgActorContextSchema.extend({
	id: warehouseIdSchema,
	expectedVersion: z.number().int().positive(),
});

export const createPaymentTermInputSchema = orgActorContextSchema.extend({
	code: codeInputSchema,
	name: nameSchema,
	netDays: z.number().int().min(0),
});

export const updatePaymentTermInputSchema = orgActorContextSchema.extend({
	id: paymentTermIdSchema,
	expectedVersion: z.number().int().positive(),
	name: nameSchema.optional(),
	netDays: z.number().int().min(0).optional(),
});

export const paymentTermLifecycleInputSchema = orgActorContextSchema.extend({
	id: paymentTermIdSchema,
	expectedVersion: z.number().int().positive(),
});

export const createTaxRegistrationInputSchema = orgActorContextSchema.extend({
	partyId: partyIdSchema,
	jurisdictionCountryId: refCountryIdSchema,
	registrationType: z.enum(TAX_REGISTRATION_TYPES),
	registrationNumber: z.string().trim().min(1).max(128),
	name: z.string().trim().min(1).max(200).optional(),
	validFrom: z.coerce.date().optional(),
	validTo: z.coerce.date().optional(),
});

export const updateTaxRegistrationInputSchema = orgActorContextSchema.extend({
	id: taxRegistrationIdSchema,
	expectedVersion: z.number().int().positive(),
	name: z.string().trim().min(1).max(200).nullable().optional(),
	validFrom: z.coerce.date().nullable().optional(),
	validTo: z.coerce.date().nullable().optional(),
});

export const taxRegistrationLifecycleInputSchema = orgActorContextSchema.extend(
	{
		id: taxRegistrationIdSchema,
		expectedVersion: z.number().int().positive(),
	},
);

export const listTaxRegistrationsInputSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		actorUserId: z.string().trim().min(1),
		page: z.number().int().min(1).optional(),
		pageSize: z.number().int().min(1).max(MAX_MASTER_PAGE_SIZE).optional(),
		status: z
			.enum(["draft", "active", "inactive", "blocked", "retired"])
			.optional(),
		partyId: partyIdSchema.optional(),
	})
	.transform((value) => ({
		...value,
		page: value.page ?? DEFAULT_MASTER_PAGE,
		pageSize: value.pageSize ?? DEFAULT_MASTER_PAGE_SIZE,
	}));

export const findTaxRegistrationsByPartyInputSchema = z.object({
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
	partyId: partyIdSchema,
});

export const getByIdInputSchema = orgQueryActorSchema.extend({
	id: z.string().uuid(),
});

export const getByCodeInputSchema = orgQueryActorSchema.extend({
	code: codeInputSchema,
});

export const createItemTemplateInputSchema = orgActorContextSchema.extend({
	code: codeInputSchema,
	name: nameSchema,
});

export const updateItemTemplateInputSchema = orgActorContextSchema.extend({
	id: itemTemplateIdSchema,
	expectedVersion: z.number().int().positive(),
	name: nameSchema.optional(),
});

export const itemTemplateLifecycleInputSchema = orgActorContextSchema.extend({
	id: itemTemplateIdSchema,
	expectedVersion: z.number().int().positive(),
});

export const addItemTemplateAttributeInputSchema = orgActorContextSchema.extend(
	{
		templateId: itemTemplateIdSchema,
		code: codeInputSchema,
		name: nameSchema,
		valueKind: z.enum(ITEM_TEMPLATE_ATTRIBUTE_VALUE_KINDS),
		isRequired: z.boolean().optional(),
		sortOrder: z.number().int().optional(),
	},
);

export const addItemTemplateAttributeOptionInputSchema =
	orgActorContextSchema.extend({
		attributeId: itemTemplateAttributeIdSchema,
		code: codeInputSchema,
		label: nameSchema,
		sortOrder: z.number().int().optional(),
	});

export const createItemVariantAttributeValueInputSchema = z
	.object({
		attributeId: itemTemplateAttributeIdSchema,
		valueText: z.string().trim().min(1).max(200).optional(),
		optionId: itemTemplateAttributeOptionIdSchema.optional(),
	})
	.superRefine((value, ctx) => {
		const hasText = value.valueText !== undefined;
		const hasOption = value.optionId !== undefined;
		if (hasText === hasOption) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"Each attribute value needs exactly one of valueText or optionId",
			});
		}
	});

export const createItemVariantInputSchema = orgActorContextSchema.extend({
	templateId: itemTemplateIdSchema,
	code: codeInputSchema,
	name: nameSchema,
	itemType: z.enum(ITEM_TYPES),
	baseUomId: refUomIdSchema,
	itemGroupId: itemGroupIdSchema,
	attributeValues: z
		.array(createItemVariantAttributeValueInputSchema)
		.min(1)
		.max(50),
});

export const listItemVariantsByTemplateInputSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		actorUserId: z.string().trim().min(1),
		templateId: itemTemplateIdSchema,
		page: z.number().int().min(1).optional(),
		pageSize: z.number().int().min(1).max(MAX_MASTER_PAGE_SIZE).optional(),
		status: z
			.enum(["draft", "active", "inactive", "blocked", "retired"])
			.optional(),
	})
	.transform((value) => ({
		...value,
		page: value.page ?? DEFAULT_MASTER_PAGE,
		pageSize: value.pageSize ?? DEFAULT_MASTER_PAGE_SIZE,
	}));

export const listItemTemplateAttributesInputSchema = orgQueryActorSchema.extend(
	{
		templateId: itemTemplateIdSchema,
	},
);

export const listItemTemplateAttributeOptionsInputSchema =
	orgQueryActorSchema.extend({
		attributeId: itemTemplateAttributeIdSchema,
	});

export const getItemVariantByIdInputSchema = orgQueryActorSchema.extend({
	id: itemVariantIdSchema,
});

export type CreatePartyInput = z.infer<typeof createPartyInputSchema>;
export type UpdatePartyInput = z.infer<typeof updatePartyInputSchema>;
export type CreateItemInput = z.infer<typeof createItemInputSchema>;
export type UpdateItemInput = z.infer<typeof updateItemInputSchema>;
export type CreateItemGroupInput = z.infer<typeof createItemGroupInputSchema>;
export type UpdateItemGroupInput = z.infer<typeof updateItemGroupInputSchema>;
export type CreateWarehouseInput = z.infer<typeof createWarehouseInputSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseInputSchema>;
export type MoveWarehouseInput = z.infer<typeof moveWarehouseInputSchema>;
export type CreatePaymentTermInput = z.infer<
	typeof createPaymentTermInputSchema
>;
export type UpdatePaymentTermInput = z.infer<
	typeof updatePaymentTermInputSchema
>;
export type CreateTaxRegistrationInput = z.infer<
	typeof createTaxRegistrationInputSchema
>;
export type UpdateTaxRegistrationInput = z.infer<
	typeof updateTaxRegistrationInputSchema
>;
export type MasterListQuery = z.infer<typeof masterListOptionsSchema>;
export type CreateItemTemplateInput = z.infer<
	typeof createItemTemplateInputSchema
>;
export type UpdateItemTemplateInput = z.infer<
	typeof updateItemTemplateInputSchema
>;
export type CreateItemVariantInput = z.infer<
	typeof createItemVariantInputSchema
>;
