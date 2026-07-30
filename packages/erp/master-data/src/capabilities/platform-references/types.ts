import type {
	RefCountryId,
	RefCurrencyId,
	RefLanguageId,
	RefTimeZoneId,
	RefUomDimensionId,
	RefUomId,
} from "./brands";
import type {
	CountryCode,
	CurrencyCode,
	LanguageCode,
	TimeZoneCode,
	UomCode,
	UomDimensionCode,
} from "./schemas";

export const REFERENCE_STATUSES = ["active", "inactive"] as const;
export type ReferenceStatus = (typeof REFERENCE_STATUSES)[number];

export interface RefCountry {
	active: boolean;
	alpha3: string;
	code: CountryCode;
	id: RefCountryId;
	name: string;
}

export interface RefCurrency {
	active: boolean;
	code: CurrencyCode;
	id: RefCurrencyId;
	minorUnits: number;
	name: string;
}

export interface RefLanguage {
	active: boolean;
	code: LanguageCode;
	id: RefLanguageId;
	name: string;
}

export interface RefTimeZone {
	active: boolean;
	ianaName: TimeZoneCode;
	id: RefTimeZoneId;
	name: string;
}

export interface RefUomDimension {
	code: UomDimensionCode;
	id: RefUomDimensionId;
	name: string;
}

export interface RefUom {
	active: boolean;
	code: UomCode;
	dimensionId: RefUomDimensionId;
	id: RefUomId;
	isBase: boolean;
	name: string;
	symbol: string;
	toBaseDenominator: string;
	toBaseNumerator: string;
}

export interface ListPage<TItem> {
	items: TItem[];
	nextCursor?: string;
}

export const UOM_DIMENSION_COMPATIBILITY_POLICIES = [
	"strict_dimension",
	"item_governed_packaging",
] as const;

export type UomDimensionCompatibilityPolicy =
	(typeof UOM_DIMENSION_COMPATIBILITY_POLICIES)[number];

export interface UomDimensionCompatibilityInput {
	alternateUom: RefUom;
	baseUom: RefUom;
	isApprovedPackagingOrCountConversion?: boolean;
	policy: UomDimensionCompatibilityPolicy;
}

export const uomConversionDirection =
	"1 alternate UoM = conversionFactor x base UoM" as const;
export type UomConversionDirection = typeof uomConversionDirection;

export interface MemoryPlatformReferenceSeed {
	countries?: RefCountry[];
	currencies?: RefCurrency[];
	languages?: RefLanguage[];
	timeZones?: RefTimeZone[];
	uomDimensions?: RefUomDimension[];
	uoms?: RefUom[];
}
