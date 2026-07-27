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
	getCountryById(id: RefCountryId): Promise<RefCountry | null>;
	getCountryByCode(code: CountryCode): Promise<RefCountry | null>;
	listCountries(input: ListRefCountriesInput): Promise<ListPage<RefCountry>>;
	getCurrencyById(id: RefCurrencyId): Promise<RefCurrency | null>;
	getCurrencyByCode(code: CurrencyCode): Promise<RefCurrency | null>;
	listCurrencies(input: ListRefCurrenciesInput): Promise<ListPage<RefCurrency>>;
	getLanguageById(id: RefLanguageId): Promise<RefLanguage | null>;
	getLanguageByCode(code: LanguageCode): Promise<RefLanguage | null>;
	listLanguages(input: ListRefLanguagesInput): Promise<ListPage<RefLanguage>>;
	getTimeZoneById(id: RefTimeZoneId): Promise<RefTimeZone | null>;
	getTimeZoneByCode(code: TimeZoneCode): Promise<RefTimeZone | null>;
	listTimeZones(input: ListRefTimeZonesInput): Promise<ListPage<RefTimeZone>>;
	getUomDimensionById(id: RefUomDimensionId): Promise<RefUomDimension | null>;
	getUomDimensionByCode(
		code: UomDimensionCode,
	): Promise<RefUomDimension | null>;
	listUomDimensions(
		input: ListRefUomDimensionsInput,
	): Promise<ListPage<RefUomDimension>>;
	getUomById(id: RefUomId): Promise<RefUom | null>;
	getUomByCode(code: UomCode): Promise<RefUom | null>;
	listUoms(input: ListRefUomsInput): Promise<ListPage<RefUom>>;
	listUomsByDimension(
		input: ListRefUomsByDimensionInput,
	): Promise<ListPage<RefUom>>;
}
