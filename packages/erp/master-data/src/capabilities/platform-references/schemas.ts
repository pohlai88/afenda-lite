import { z } from "zod";
import {
	refCountryIdSchema,
	refCurrencyIdSchema,
	refLanguageIdSchema,
	refTimeZoneIdSchema,
	refUomDimensionIdSchema,
	refUomIdSchema,
} from "./brands";

export * from "./brands";

export const DEFAULT_REFERENCE_PAGE_SIZE = 50;
export const MAX_REFERENCE_PAGE_SIZE = 100;

export const referenceStatusFilterSchema = z
	.enum(["active", "inactive", "all"])
	.default("active");
export type ReferenceStatusFilter = z.infer<typeof referenceStatusFilterSchema>;

const referencePageInputSchema = z
	.object({
		search: z.string().trim().max(100).optional(),
		pageSize: z
			.number()
			.int()
			.min(1)
			.max(MAX_REFERENCE_PAGE_SIZE)
			.default(DEFAULT_REFERENCE_PAGE_SIZE),
		cursor: z.string().trim().regex(/^\d+$/).optional(),
	})
	.strict();

const referenceListInputSchema = referencePageInputSchema.extend({
	status: referenceStatusFilterSchema,
});

export const countryCodeSchema = z
	.string()
	.trim()
	.toUpperCase()
	.regex(/^[A-Z]{2}$/)
	.brand<"CountryCode">();
export type CountryCode = z.infer<typeof countryCodeSchema>;

export const currencyCodeSchema = z
	.string()
	.trim()
	.toUpperCase()
	.regex(/^[A-Z]{3}$/)
	.brand<"CurrencyCode">();
export type CurrencyCode = z.infer<typeof currencyCodeSchema>;

function normalizeLanguageCode(value: string): string {
	const [language, ...rest] = value.trim().split("-");
	if (!language) return value.trim();
	return [
		language.toLowerCase(),
		...rest.map((part) => {
			if (part.length === 2) return part.toUpperCase();
			if (part.length === 4) {
				return `${part[0]?.toUpperCase() ?? ""}${part.slice(1).toLowerCase()}`;
			}
			return part;
		}),
	].join("-");
}

export const languageCodeSchema = z
	.string()
	.trim()
	.min(2)
	.max(35)
	.transform(normalizeLanguageCode)
	.pipe(
		z
			.string()
			.regex(/^[a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2}|-\d{3})?$/)
			.brand<"LanguageCode">(),
	);
export type LanguageCode = z.infer<typeof languageCodeSchema>;

export const timeZoneCodeSchema = z
	.string()
	.trim()
	.min(1)
	.max(100)
	.regex(/^(?:UTC|[A-Za-z]+(?:[/_-][A-Za-z0-9+_-]+)+)$/)
	.brand<"TimeZoneCode">();
export type TimeZoneCode = z.infer<typeof timeZoneCodeSchema>;

export const UOM_DIMENSION_CODES = [
	"count",
	"mass",
	"volume",
	"length",
	"area",
	"time",
] as const;

export const uomDimensionCodeSchema = z
	.string()
	.trim()
	.toLowerCase()
	.pipe(z.enum(UOM_DIMENSION_CODES).brand<"UomDimensionCode">());
export type UomDimensionCode = z.infer<typeof uomDimensionCodeSchema>;

export const uomCodeSchema = z
	.string()
	.trim()
	.toUpperCase()
	.min(1)
	.max(32)
	.regex(/^[A-Z0-9._-]+$/)
	.brand<"UomCode">();
export type UomCode = z.infer<typeof uomCodeSchema>;

export const getRefCountryInputSchema = z.object({ id: refCountryIdSchema });
export type GetRefCountryInput = z.infer<typeof getRefCountryInputSchema>;
export const getRefCountryByCodeInputSchema = z.object({
	code: countryCodeSchema,
});
export type GetRefCountryByCodeInput = z.infer<
	typeof getRefCountryByCodeInputSchema
>;
export const listRefCountriesInputSchema = referenceListInputSchema;
export type ListRefCountriesInput = z.infer<typeof listRefCountriesInputSchema>;

export const getRefCurrencyInputSchema = z.object({ id: refCurrencyIdSchema });
export type GetRefCurrencyInput = z.infer<typeof getRefCurrencyInputSchema>;
export const getRefCurrencyByCodeInputSchema = z.object({
	code: currencyCodeSchema,
});
export type GetRefCurrencyByCodeInput = z.infer<
	typeof getRefCurrencyByCodeInputSchema
>;
export const listRefCurrenciesInputSchema = referenceListInputSchema;
export type ListRefCurrenciesInput = z.infer<
	typeof listRefCurrenciesInputSchema
>;

export const getRefLanguageInputSchema = z.object({ id: refLanguageIdSchema });
export type GetRefLanguageInput = z.infer<typeof getRefLanguageInputSchema>;
export const getRefLanguageByCodeInputSchema = z.object({
	code: languageCodeSchema,
});
export type GetRefLanguageByCodeInput = z.infer<
	typeof getRefLanguageByCodeInputSchema
>;
export const listRefLanguagesInputSchema = referenceListInputSchema;
export type ListRefLanguagesInput = z.infer<typeof listRefLanguagesInputSchema>;

export const getRefTimeZoneInputSchema = z.object({ id: refTimeZoneIdSchema });
export type GetRefTimeZoneInput = z.infer<typeof getRefTimeZoneInputSchema>;
export const getRefTimeZoneByCodeInputSchema = z.object({
	code: timeZoneCodeSchema,
});
export type GetRefTimeZoneByCodeInput = z.infer<
	typeof getRefTimeZoneByCodeInputSchema
>;
export const listRefTimeZonesInputSchema = referenceListInputSchema;
export type ListRefTimeZonesInput = z.infer<typeof listRefTimeZonesInputSchema>;

export const getRefUomDimensionInputSchema = z.object({
	id: refUomDimensionIdSchema,
});
export type GetRefUomDimensionInput = z.infer<
	typeof getRefUomDimensionInputSchema
>;
export const getRefUomDimensionByCodeInputSchema = z.object({
	code: uomDimensionCodeSchema,
});
export type GetRefUomDimensionByCodeInput = z.infer<
	typeof getRefUomDimensionByCodeInputSchema
>;
export const listRefUomDimensionsInputSchema =
	referencePageInputSchema.strict();
export type ListRefUomDimensionsInput = z.infer<
	typeof listRefUomDimensionsInputSchema
>;

export const getRefUomInputSchema = z.object({ id: refUomIdSchema });
export type GetRefUomInput = z.infer<typeof getRefUomInputSchema>;
export const getRefUomByCodeInputSchema = z.object({ code: uomCodeSchema });
export type GetRefUomByCodeInput = z.infer<typeof getRefUomByCodeInputSchema>;
export const listRefUomsInputSchema = referenceListInputSchema;
export type ListRefUomsInput = z.infer<typeof listRefUomsInputSchema>;
export const listRefUomsByDimensionInputSchema =
	referenceListInputSchema.extend({
		dimensionId: refUomDimensionIdSchema,
	});
export type ListRefUomsByDimensionInput = z.infer<
	typeof listRefUomsByDimensionInputSchema
>;
export type PlatformReferenceListInput = z.infer<
	typeof referenceListInputSchema
>;
