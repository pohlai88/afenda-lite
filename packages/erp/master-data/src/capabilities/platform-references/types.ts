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

export type RefCountry = {
	id: RefCountryId;
	code: CountryCode;
	alpha3: string;
	name: string;
	active: boolean;
};

export type RefCurrency = {
	id: RefCurrencyId;
	code: CurrencyCode;
	name: string;
	minorUnits: number;
	active: boolean;
};

export type RefLanguage = {
	id: RefLanguageId;
	code: LanguageCode;
	name: string;
	active: boolean;
};

export type RefTimeZone = {
	id: RefTimeZoneId;
	ianaName: TimeZoneCode;
	name: string;
	active: boolean;
};

export type RefUomDimension = {
	id: RefUomDimensionId;
	code: UomDimensionCode;
	name: string;
};

export type RefUom = {
	id: RefUomId;
	code: UomCode;
	name: string;
	symbol: string;
	dimensionId: RefUomDimensionId;
	toBaseNumerator: string;
	toBaseDenominator: string;
	isBase: boolean;
	active: boolean;
};

export type ListPage<TItem> = {
	items: TItem[];
	nextCursor?: string;
};

export const UOM_DIMENSION_COMPATIBILITY_POLICIES = [
	"strict_dimension",
	"item_governed_packaging",
] as const;

export type UomDimensionCompatibilityPolicy =
	(typeof UOM_DIMENSION_COMPATIBILITY_POLICIES)[number];

export type UomDimensionCompatibilityInput = {
	baseUom: RefUom;
	alternateUom: RefUom;
	policy: UomDimensionCompatibilityPolicy;
	isApprovedPackagingOrCountConversion?: boolean;
};

export const uomConversionDirection =
	"1 alternate UoM = conversionFactor x base UoM" as const;
export type UomConversionDirection = typeof uomConversionDirection;

export type MemoryPlatformReferenceSeed = {
	countries?: RefCountry[];
	currencies?: RefCurrency[];
	languages?: RefLanguage[];
	timeZones?: RefTimeZone[];
	uomDimensions?: RefUomDimension[];
	uoms?: RefUom[];
};
