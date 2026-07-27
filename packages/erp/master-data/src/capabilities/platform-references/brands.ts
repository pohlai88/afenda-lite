import { z } from "zod";

export const refCountryIdSchema = z.string().uuid().brand<"RefCountryId">();
export type RefCountryId = z.infer<typeof refCountryIdSchema>;

export const refCurrencyIdSchema = z.string().uuid().brand<"RefCurrencyId">();
export type RefCurrencyId = z.infer<typeof refCurrencyIdSchema>;

export const refLanguageIdSchema = z.string().uuid().brand<"RefLanguageId">();
export type RefLanguageId = z.infer<typeof refLanguageIdSchema>;

export const refTimeZoneIdSchema = z.string().uuid().brand<"RefTimeZoneId">();
export type RefTimeZoneId = z.infer<typeof refTimeZoneIdSchema>;

export const refUomDimensionIdSchema = z
	.string()
	.uuid()
	.brand<"RefUomDimensionId">();
export type RefUomDimensionId = z.infer<typeof refUomDimensionIdSchema>;

export const refUomIdSchema = z.string().uuid().brand<"RefUomId">();
export type RefUomId = z.infer<typeof refUomIdSchema>;
