import type {
	CountryCode,
	CurrencyCode,
	LanguageCode,
	ListRefCountriesInput,
	ListRefCurrenciesInput,
	ListRefLanguagesInput,
	ListRefTimeZonesInput,
	ListRefUomDimensionsInput,
	ListRefUomsByDimensionInput,
	ListRefUomsInput,
	RefCountryId,
	RefCurrencyId,
	RefLanguageId,
	RefTimeZoneId,
	RefUomDimensionId,
	RefUomId,
	TimeZoneCode,
	UomCode,
	UomDimensionCode,
} from "./schemas";
import type {
	ListPage,
	RefCountry,
	RefCurrency,
	RefLanguage,
	RefTimeZone,
	RefUom,
	RefUomDimension,
} from "./types";

export interface PlatformReferenceStore {
	getCountryByCode: (code: CountryCode) => Promise<RefCountry | null>;
	getCountryById: (id: RefCountryId) => Promise<RefCountry | null>;
	getCurrencyByCode: (code: CurrencyCode) => Promise<RefCurrency | null>;
	getCurrencyById: (id: RefCurrencyId) => Promise<RefCurrency | null>;
	getLanguageByCode: (code: LanguageCode) => Promise<RefLanguage | null>;
	getLanguageById: (id: RefLanguageId) => Promise<RefLanguage | null>;
	getTimeZoneByCode: (code: TimeZoneCode) => Promise<RefTimeZone | null>;
	getTimeZoneById: (id: RefTimeZoneId) => Promise<RefTimeZone | null>;
	getUomByCode: (code: UomCode) => Promise<RefUom | null>;
	getUomById: (id: RefUomId) => Promise<RefUom | null>;
	getUomDimensionByCode: (
		code: UomDimensionCode,
	) => Promise<RefUomDimension | null>;
	getUomDimensionById: (
		id: RefUomDimensionId,
	) => Promise<RefUomDimension | null>;
	listCountries: (
		input: ListRefCountriesInput,
	) => Promise<ListPage<RefCountry>>;
	listCurrencies: (
		input: ListRefCurrenciesInput,
	) => Promise<ListPage<RefCurrency>>;
	listLanguages: (
		input: ListRefLanguagesInput,
	) => Promise<ListPage<RefLanguage>>;
	listTimeZones: (
		input: ListRefTimeZonesInput,
	) => Promise<ListPage<RefTimeZone>>;
	listUomDimensions: (
		input: ListRefUomDimensionsInput,
	) => Promise<ListPage<RefUomDimension>>;
	listUoms: (input: ListRefUomsInput) => Promise<ListPage<RefUom>>;
	listUomsByDimension: (
		input: ListRefUomsByDimensionInput,
	) => Promise<ListPage<RefUom>>;
}
