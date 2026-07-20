import { z } from "zod";

export const partyIdSchema = z.string().uuid().brand<"PartyId">();
export type PartyId = z.infer<typeof partyIdSchema>;

export const itemIdSchema = z.string().uuid().brand<"ItemId">();
export type ItemId = z.infer<typeof itemIdSchema>;

export const itemGroupIdSchema = z.string().uuid().brand<"ItemGroupId">();
export type ItemGroupId = z.infer<typeof itemGroupIdSchema>;

export const warehouseIdSchema = z.string().uuid().brand<"WarehouseId">();
export type WarehouseId = z.infer<typeof warehouseIdSchema>;

export const paymentTermIdSchema = z.string().uuid().brand<"PaymentTermId">();
export type PaymentTermId = z.infer<typeof paymentTermIdSchema>;

export const taxRegistrationIdSchema = z
	.string()
	.uuid()
	.brand<"TaxRegistrationId">();
export type TaxRegistrationId = z.infer<typeof taxRegistrationIdSchema>;

export const refUomIdSchema = z.string().uuid().brand<"RefUomId">();
export type RefUomId = z.infer<typeof refUomIdSchema>;

export const refCountryIdSchema = z.string().uuid().brand<"RefCountryId">();
export type RefCountryId = z.infer<typeof refCountryIdSchema>;

export const refCurrencyIdSchema = z.string().uuid().brand<"RefCurrencyId">();
export type RefCurrencyId = z.infer<typeof refCurrencyIdSchema>;

export const refLanguageIdSchema = z.string().uuid().brand<"RefLanguageId">();
export type RefLanguageId = z.infer<typeof refLanguageIdSchema>;

export const partyRoleIdSchema = z.string().uuid().brand<"PartyRoleId">();
export type PartyRoleId = z.infer<typeof partyRoleIdSchema>;

export const partyAddressIdSchema = z.string().uuid().brand<"PartyAddressId">();
export type PartyAddressId = z.infer<typeof partyAddressIdSchema>;

export const partyContactIdSchema = z.string().uuid().brand<"PartyContactId">();
export type PartyContactId = z.infer<typeof partyContactIdSchema>;

export const partyExternalIdRowIdSchema = z
	.string()
	.uuid()
	.brand<"PartyExternalIdRowId">();
export type PartyExternalIdRowId = z.infer<typeof partyExternalIdRowIdSchema>;

export const partyRelationshipIdSchema = z
	.string()
	.uuid()
	.brand<"PartyRelationshipId">();
export type PartyRelationshipId = z.infer<typeof partyRelationshipIdSchema>;

export const itemUomIdSchema = z.string().uuid().brand<"ItemUomId">();
export type ItemUomId = z.infer<typeof itemUomIdSchema>;

export const itemBarcodeIdSchema = z.string().uuid().brand<"ItemBarcodeId">();
export type ItemBarcodeId = z.infer<typeof itemBarcodeIdSchema>;

export const itemExternalIdRowIdSchema = z
	.string()
	.uuid()
	.brand<"ItemExternalIdRowId">();
export type ItemExternalIdRowId = z.infer<typeof itemExternalIdRowIdSchema>;

export const itemAliasIdSchema = z.string().uuid().brand<"ItemAliasId">();
export type ItemAliasId = z.infer<typeof itemAliasIdSchema>;

export const warehouseExternalIdRowIdSchema = z
	.string()
	.uuid()
	.brand<"WarehouseExternalIdRowId">();
export type WarehouseExternalIdRowId = z.infer<
	typeof warehouseExternalIdRowIdSchema
>;

export const itemTemplateIdSchema = z.string().uuid().brand<"ItemTemplateId">();
export type ItemTemplateId = z.infer<typeof itemTemplateIdSchema>;

export const itemTemplateAttributeIdSchema = z
	.string()
	.uuid()
	.brand<"ItemTemplateAttributeId">();
export type ItemTemplateAttributeId = z.infer<
	typeof itemTemplateAttributeIdSchema
>;

export const itemTemplateAttributeOptionIdSchema = z
	.string()
	.uuid()
	.brand<"ItemTemplateAttributeOptionId">();
export type ItemTemplateAttributeOptionId = z.infer<
	typeof itemTemplateAttributeOptionIdSchema
>;

export const itemVariantIdSchema = z.string().uuid().brand<"ItemVariantId">();
export type ItemVariantId = z.infer<typeof itemVariantIdSchema>;

export const itemVariantAttributeValueIdSchema = z
	.string()
	.uuid()
	.brand<"ItemVariantAttributeValueId">();
export type ItemVariantAttributeValueId = z.infer<
	typeof itemVariantAttributeValueIdSchema
>;

export const changeRequestIdSchema = z
	.string()
	.uuid()
	.brand<"ChangeRequestId">();
export type ChangeRequestId = z.infer<typeof changeRequestIdSchema>;
