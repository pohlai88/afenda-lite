import { z } from "zod";

import {
	itemIdSchema,
	partyAddressIdSchema,
	partyContactIdSchema,
	partyIdSchema,
	partyRoleIdSchema,
	refCountryIdSchema,
	refUomIdSchema,
	warehouseIdSchema,
} from "./brands";
import {
	orgActorContextSchema,
	orgQueryActorSchema,
} from "./contracts/context";
import { positiveIntegerFactorSchema } from "./shared/uom-factor";
import {
	ITEM_UOM_ROUNDING_RULES,
	ITEM_UOM_USAGES,
	PARTY_RELATIONSHIP_TYPES,
	PARTY_ROLE_CODES,
} from "./types";

const systemSchema = z.string().trim().min(1).max(64);
const namespaceSchema = z.string().trim().max(64).default("");
const externalIdValueSchema = z.string().trim().min(1).max(128);

export const createPartyRoleInputSchema = orgActorContextSchema.extend({
	partyId: partyIdSchema,
	roleCode: z.enum(PARTY_ROLE_CODES),
	validFrom: z.coerce.date().optional(),
	validTo: z.coerce.date().optional(),
});

export const partyRoleLifecycleInputSchema = orgActorContextSchema.extend({
	id: partyRoleIdSchema,
	expectedVersion: z.number().int().positive(),
});

export const createPartyAddressInputSchema = orgActorContextSchema.extend({
	partyId: partyIdSchema,
	addressType: z.string().trim().min(1).max(64),
	line1: z.string().trim().min(1).max(200),
	line2: z.string().trim().max(200).optional(),
	city: z.string().trim().min(1).max(100),
	region: z.string().trim().max(100).optional(),
	postalCode: z.string().trim().max(32).optional(),
	countryId: refCountryIdSchema,
	isDefault: z.boolean().optional(),
});

export const updatePartyAddressInputSchema = orgActorContextSchema.extend({
	id: partyAddressIdSchema,
	expectedVersion: z.number().int().positive(),
	addressType: z.string().trim().min(1).max(64).optional(),
	line1: z.string().trim().min(1).max(200).optional(),
	line2: z.string().trim().max(200).nullable().optional(),
	city: z.string().trim().min(1).max(100).optional(),
	region: z.string().trim().max(100).nullable().optional(),
	postalCode: z.string().trim().max(32).nullable().optional(),
	countryId: refCountryIdSchema.optional(),
	isDefault: z.boolean().optional(),
});

export const createPartyContactInputSchema = orgActorContextSchema.extend({
	partyId: partyIdSchema,
	contactType: z.string().trim().min(1).max(64),
	value: z.string().trim().min(1).max(200),
	purpose: z.string().trim().max(100).optional(),
	isPrimary: z.boolean().optional(),
});

export const updatePartyContactInputSchema = orgActorContextSchema.extend({
	id: partyContactIdSchema,
	expectedVersion: z.number().int().positive(),
	contactType: z.string().trim().min(1).max(64).optional(),
	value: z.string().trim().min(1).max(200).optional(),
	purpose: z.string().trim().max(100).nullable().optional(),
	isPrimary: z.boolean().optional(),
});

export const createPartyExternalIdInputSchema = orgActorContextSchema.extend({
	partyId: partyIdSchema,
	system: systemSchema,
	namespace: namespaceSchema.optional(),
	externalId: externalIdValueSchema,
});

export const createPartyRelationshipInputSchema = orgActorContextSchema.extend({
	fromPartyId: partyIdSchema,
	toPartyId: partyIdSchema,
	relationshipType: z.enum(PARTY_RELATIONSHIP_TYPES),
});

export const createItemUomInputSchema = orgActorContextSchema.extend({
	itemId: itemIdSchema,
	uomId: refUomIdSchema,
	toBaseNumerator: positiveIntegerFactorSchema,
	toBaseDenominator: positiveIntegerFactorSchema,
	usage: z.enum(ITEM_UOM_USAGES),
	barcode: z.string().trim().max(128).optional(),
	roundingRule: z.enum(ITEM_UOM_ROUNDING_RULES).optional(),
	minQuantity: z.string().trim().max(40).optional(),
});

export const createItemBarcodeInputSchema = orgActorContextSchema.extend({
	itemId: itemIdSchema,
	barcode: z.string().trim().min(1).max(128),
	barcodeType: z.string().trim().min(1).max(64).optional(),
	isPrimary: z.boolean().optional(),
});

export const createItemExternalIdInputSchema = orgActorContextSchema.extend({
	itemId: itemIdSchema,
	system: systemSchema,
	namespace: namespaceSchema.optional(),
	externalId: externalIdValueSchema,
});

export const createItemAliasInputSchema = orgActorContextSchema.extend({
	itemId: itemIdSchema,
	aliasCode: z.string().trim().min(1).max(64),
});

export const createWarehouseExternalIdInputSchema =
	orgActorContextSchema.extend({
		warehouseId: warehouseIdSchema,
		system: systemSchema,
		namespace: namespaceSchema.optional(),
		externalId: externalIdValueSchema,
	});

export const findByExternalIdInputSchema = orgQueryActorSchema.extend({
	system: systemSchema,
	namespace: namespaceSchema.optional(),
	externalId: externalIdValueSchema,
});

export const findItemByAliasInputSchema = orgQueryActorSchema.extend({
	aliasCode: z.string().trim().min(1).max(64),
});

export const listByParentInputSchema = orgQueryActorSchema.extend({
	parentId: z.string().uuid(),
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(25),
});

export type CreatePartyRoleInput = z.infer<typeof createPartyRoleInputSchema>;
export type CreatePartyAddressInput = z.infer<
	typeof createPartyAddressInputSchema
>;
export type CreatePartyContactInput = z.infer<
	typeof createPartyContactInputSchema
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
export type CreateItemExternalIdInput = z.infer<
	typeof createItemExternalIdInputSchema
>;
export type CreateItemAliasInput = z.infer<typeof createItemAliasInputSchema>;
export type CreateWarehouseExternalIdInput = z.infer<
	typeof createWarehouseExternalIdInputSchema
>;
