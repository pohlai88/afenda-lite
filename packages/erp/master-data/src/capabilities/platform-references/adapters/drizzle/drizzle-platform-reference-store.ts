import {
	and,
	asc,
	db,
	eq,
	or,
	refCountry,
	refCurrency,
	refLanguage,
	refTimeZone,
	refUom,
	refUomDimension,
	sql,
} from "@afenda/db";
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
} from "../../schemas";
import {
	countryCodeSchema,
	currencyCodeSchema,
	languageCodeSchema,
	refCountryIdSchema,
	refCurrencyIdSchema,
	refLanguageIdSchema,
	refTimeZoneIdSchema,
	refUomDimensionIdSchema,
	refUomIdSchema,
	timeZoneCodeSchema,
	uomCodeSchema,
	uomDimensionCodeSchema,
} from "../../schemas";
import type { PlatformReferenceStore } from "../../store";
import type {
	ListPage,
	RefCountry,
	RefCurrency,
	RefLanguage,
	RefTimeZone,
	RefUom,
	RefUomDimension,
} from "../../types";

interface RefCountryRow {
	active: boolean;
	alpha3: string;
	code: string;
	id: string;
	name: string;
}

interface RefCurrencyRow {
	active: boolean;
	code: string;
	id: string;
	minorUnits: number;
	name: string;
}

interface RefLanguageRow {
	active: boolean;
	code: string;
	id: string;
	name: string;
}

interface RefTimeZoneRow {
	active: boolean;
	ianaName: string;
	id: string;
	name: string;
}

interface RefUomDimensionRow {
	code: string;
	id: string;
	name: string;
}

interface RefUomRow {
	active: boolean;
	code: string;
	dimensionId: string;
	id: string;
	isBase: boolean;
	name: string;
	symbol: string;
	toBaseDenominator: string;
	toBaseNumerator: string;
}

const countryColumns = {
	id: refCountry.id,
	code: refCountry.code,
	alpha3: refCountry.alpha3,
	name: refCountry.name,
	active: refCountry.active,
};

const currencyColumns = {
	id: refCurrency.id,
	code: refCurrency.code,
	name: refCurrency.name,
	minorUnits: refCurrency.minorUnits,
	active: refCurrency.active,
};

const languageColumns = {
	id: refLanguage.id,
	code: refLanguage.code,
	name: refLanguage.name,
	active: refLanguage.active,
};

const timeZoneColumns = {
	id: refTimeZone.id,
	ianaName: refTimeZone.ianaName,
	name: refTimeZone.name,
	active: refTimeZone.active,
};

const uomDimensionColumns = {
	id: refUomDimension.id,
	code: refUomDimension.code,
	name: refUomDimension.name,
};

const uomColumns = {
	id: refUom.id,
	code: refUom.code,
	name: refUom.name,
	symbol: refUom.symbol,
	dimensionId: refUom.dimensionId,
	toBaseNumerator: refUom.toBaseNumerator,
	toBaseDenominator: refUom.toBaseDenominator,
	isBase: refUom.isBase,
	active: refUom.active,
};

function activeForStatus(
	status: "active" | "inactive" | "all",
): boolean | null {
	if (status === "all") {
		return null;
	}
	return status === "active";
}

function cursorOffset(cursor?: string): number {
	if (cursor === undefined) {
		return 0;
	}
	const parsed = Number.parseInt(cursor, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function page<TItem>(
	rows: TItem[],
	offset: number,
	pageSize: number,
): ListPage<TItem> {
	const items = rows.slice(0, pageSize);
	const next = offset + pageSize;
	return rows.length > pageSize
		? { items, nextCursor: String(next) }
		: { items };
}

function searchPattern(search?: string): string | null {
	const value = search?.trim();
	return value ? `%${value}%` : null;
}

function textSearch(column: unknown, search: string) {
	return sql`${column} ilike ${search}`;
}

function textSearchEither(left: unknown, right: unknown, search: string) {
	return or(textSearch(left, search), textSearch(right, search)) ?? sql`false`;
}

function mapCountry(row: RefCountryRow): RefCountry {
	return {
		id: refCountryIdSchema.parse(row.id),
		code: countryCodeSchema.parse(row.code),
		alpha3: row.alpha3,
		name: row.name,
		active: row.active,
	};
}

function mapCurrency(row: RefCurrencyRow): RefCurrency {
	return {
		id: refCurrencyIdSchema.parse(row.id),
		code: currencyCodeSchema.parse(row.code),
		name: row.name,
		minorUnits: row.minorUnits,
		active: row.active,
	};
}

function mapLanguage(row: RefLanguageRow): RefLanguage {
	return {
		id: refLanguageIdSchema.parse(row.id),
		code: languageCodeSchema.parse(row.code),
		name: row.name,
		active: row.active,
	};
}

function mapTimeZone(row: RefTimeZoneRow): RefTimeZone {
	return {
		id: refTimeZoneIdSchema.parse(row.id),
		ianaName: timeZoneCodeSchema.parse(row.ianaName),
		name: row.name,
		active: row.active,
	};
}

function mapUomDimension(row: RefUomDimensionRow): RefUomDimension {
	return {
		id: refUomDimensionIdSchema.parse(row.id),
		code: uomDimensionCodeSchema.parse(row.code),
		name: row.name,
	};
}

function mapUom(row: RefUomRow): RefUom {
	return {
		id: refUomIdSchema.parse(row.id),
		dimensionId: refUomDimensionIdSchema.parse(row.dimensionId),
		code: uomCodeSchema.parse(row.code),
		name: row.name,
		symbol: row.symbol,
		toBaseNumerator: String(row.toBaseNumerator),
		toBaseDenominator: String(row.toBaseDenominator),
		isBase: row.isBase,
		active: row.active,
	};
}

export class DrizzlePlatformReferenceStore implements PlatformReferenceStore {
	async getCountryById(id: RefCountryId): Promise<RefCountry | null> {
		const [row] = await db
			.select(countryColumns)
			.from(refCountry)
			.where(eq(refCountry.id, id))
			.limit(1);
		return row === undefined ? null : mapCountry(row);
	}

	async getCountryByCode(code: CountryCode): Promise<RefCountry | null> {
		const [row] = await db
			.select(countryColumns)
			.from(refCountry)
			.where(eq(refCountry.code, code))
			.limit(1);
		return row === undefined ? null : mapCountry(row);
	}

	async listCountries(
		input: ListRefCountriesInput,
	): Promise<ListPage<RefCountry>> {
		const predicates: ReturnType<typeof textSearch>[] = [];
		const active = activeForStatus(input.status);
		if (active !== null) {
			predicates.push(eq(refCountry.active, active));
		}
		const search = searchPattern(input.search);
		if (search !== null) {
			predicates.push(
				textSearchEither(refCountry.code, refCountry.name, search),
			);
		}
		const offset = cursorOffset(input.cursor);
		const rows = await db
			.select(countryColumns)
			.from(refCountry)
			.where(predicates.length > 0 ? and(...predicates) : undefined)
			.orderBy(asc(refCountry.name), asc(refCountry.code))
			.limit(input.pageSize + 1)
			.offset(offset);
		return page(rows.map(mapCountry), offset, input.pageSize);
	}

	async getCurrencyById(id: RefCurrencyId): Promise<RefCurrency | null> {
		const [row] = await db
			.select(currencyColumns)
			.from(refCurrency)
			.where(eq(refCurrency.id, id))
			.limit(1);
		return row === undefined ? null : mapCurrency(row);
	}

	async getCurrencyByCode(code: CurrencyCode): Promise<RefCurrency | null> {
		const [row] = await db
			.select(currencyColumns)
			.from(refCurrency)
			.where(eq(refCurrency.code, code))
			.limit(1);
		return row === undefined ? null : mapCurrency(row);
	}

	async listCurrencies(
		input: ListRefCurrenciesInput,
	): Promise<ListPage<RefCurrency>> {
		const predicates: ReturnType<typeof textSearch>[] = [];
		const active = activeForStatus(input.status);
		if (active !== null) {
			predicates.push(eq(refCurrency.active, active));
		}
		const search = searchPattern(input.search);
		if (search !== null) {
			predicates.push(
				textSearchEither(refCurrency.code, refCurrency.name, search),
			);
		}
		const offset = cursorOffset(input.cursor);
		const rows = await db
			.select(currencyColumns)
			.from(refCurrency)
			.where(predicates.length > 0 ? and(...predicates) : undefined)
			.orderBy(asc(refCurrency.code))
			.limit(input.pageSize + 1)
			.offset(offset);
		return page(rows.map(mapCurrency), offset, input.pageSize);
	}

	async getLanguageById(id: RefLanguageId): Promise<RefLanguage | null> {
		const [row] = await db
			.select(languageColumns)
			.from(refLanguage)
			.where(eq(refLanguage.id, id))
			.limit(1);
		return row === undefined ? null : mapLanguage(row);
	}

	async getLanguageByCode(code: LanguageCode): Promise<RefLanguage | null> {
		const [row] = await db
			.select(languageColumns)
			.from(refLanguage)
			.where(eq(refLanguage.code, code))
			.limit(1);
		return row === undefined ? null : mapLanguage(row);
	}

	async listLanguages(
		input: ListRefLanguagesInput,
	): Promise<ListPage<RefLanguage>> {
		const predicates: ReturnType<typeof textSearch>[] = [];
		const active = activeForStatus(input.status);
		if (active !== null) {
			predicates.push(eq(refLanguage.active, active));
		}
		const search = searchPattern(input.search);
		if (search !== null) {
			predicates.push(
				textSearchEither(refLanguage.code, refLanguage.name, search),
			);
		}
		const offset = cursorOffset(input.cursor);
		const rows = await db
			.select(languageColumns)
			.from(refLanguage)
			.where(predicates.length > 0 ? and(...predicates) : undefined)
			.orderBy(asc(refLanguage.name), asc(refLanguage.code))
			.limit(input.pageSize + 1)
			.offset(offset);
		return page(rows.map(mapLanguage), offset, input.pageSize);
	}

	async getTimeZoneById(id: RefTimeZoneId): Promise<RefTimeZone | null> {
		const [row] = await db
			.select(timeZoneColumns)
			.from(refTimeZone)
			.where(eq(refTimeZone.id, id))
			.limit(1);
		return row === undefined ? null : mapTimeZone(row);
	}

	async getTimeZoneByCode(code: TimeZoneCode): Promise<RefTimeZone | null> {
		const [row] = await db
			.select(timeZoneColumns)
			.from(refTimeZone)
			.where(eq(refTimeZone.ianaName, code))
			.limit(1);
		return row === undefined ? null : mapTimeZone(row);
	}

	async listTimeZones(
		input: ListRefTimeZonesInput,
	): Promise<ListPage<RefTimeZone>> {
		const predicates: ReturnType<typeof textSearch>[] = [];
		const active = activeForStatus(input.status);
		if (active !== null) {
			predicates.push(eq(refTimeZone.active, active));
		}
		const search = searchPattern(input.search);
		if (search !== null) {
			predicates.push(
				textSearchEither(refTimeZone.ianaName, refTimeZone.name, search),
			);
		}
		const offset = cursorOffset(input.cursor);
		const rows = await db
			.select(timeZoneColumns)
			.from(refTimeZone)
			.where(predicates.length > 0 ? and(...predicates) : undefined)
			.orderBy(asc(refTimeZone.ianaName))
			.limit(input.pageSize + 1)
			.offset(offset);
		return page(rows.map(mapTimeZone), offset, input.pageSize);
	}

	async getUomDimensionById(
		id: RefUomDimensionId,
	): Promise<RefUomDimension | null> {
		const [row] = await db
			.select(uomDimensionColumns)
			.from(refUomDimension)
			.where(eq(refUomDimension.id, id))
			.limit(1);
		return row === undefined ? null : mapUomDimension(row);
	}

	async getUomDimensionByCode(
		code: UomDimensionCode,
	): Promise<RefUomDimension | null> {
		const [row] = await db
			.select(uomDimensionColumns)
			.from(refUomDimension)
			.where(eq(refUomDimension.code, code))
			.limit(1);
		return row === undefined ? null : mapUomDimension(row);
	}

	async listUomDimensions(
		input: ListRefUomDimensionsInput,
	): Promise<ListPage<RefUomDimension>> {
		const search = searchPattern(input.search);
		const rows = await db
			.select(uomDimensionColumns)
			.from(refUomDimension)
			.where(
				search === null
					? undefined
					: textSearchEither(
							refUomDimension.code,
							refUomDimension.name,
							search,
						),
			)
			.orderBy(asc(refUomDimension.name), asc(refUomDimension.code))
			.limit(input.pageSize + 1)
			.offset(cursorOffset(input.cursor));
		const offset = cursorOffset(input.cursor);
		return page(rows.map(mapUomDimension), offset, input.pageSize);
	}

	async getUomById(id: RefUomId): Promise<RefUom | null> {
		const [row] = await db
			.select(uomColumns)
			.from(refUom)
			.where(eq(refUom.id, id))
			.limit(1);
		return row === undefined ? null : mapUom(row);
	}

	async getUomByCode(code: UomCode): Promise<RefUom | null> {
		const [row] = await db
			.select(uomColumns)
			.from(refUom)
			.where(eq(refUom.code, code))
			.limit(1);
		return row === undefined ? null : mapUom(row);
	}

	async listUoms(input: ListRefUomsInput): Promise<ListPage<RefUom>> {
		const predicates: ReturnType<typeof textSearch>[] = [];
		const active = activeForStatus(input.status);
		if (active !== null) {
			predicates.push(eq(refUom.active, active));
		}
		const search = searchPattern(input.search);
		if (search !== null) {
			predicates.push(textSearchEither(refUom.code, refUom.name, search));
		}
		const offset = cursorOffset(input.cursor);
		const rows = await db
			.select(uomColumns)
			.from(refUom)
			.where(predicates.length > 0 ? and(...predicates) : undefined)
			.orderBy(asc(refUom.dimensionId), asc(refUom.name), asc(refUom.code))
			.limit(input.pageSize + 1)
			.offset(offset);
		return page(rows.map(mapUom), offset, input.pageSize);
	}

	async listUomsByDimension(
		input: ListRefUomsByDimensionInput,
	): Promise<ListPage<RefUom>> {
		const predicates = [eq(refUom.dimensionId, input.dimensionId)];
		const active = activeForStatus(input.status);
		if (active !== null) {
			predicates.push(eq(refUom.active, active));
		}
		const search = searchPattern(input.search);
		if (search !== null) {
			predicates.push(textSearchEither(refUom.code, refUom.name, search));
		}
		const offset = cursorOffset(input.cursor);
		const rows = await db
			.select(uomColumns)
			.from(refUom)
			.where(and(...predicates))
			.orderBy(asc(refUom.name), asc(refUom.code))
			.limit(input.pageSize + 1)
			.offset(offset);
		return page(rows.map(mapUom), offset, input.pageSize);
	}
}

export function createDrizzlePlatformReferenceStore(): PlatformReferenceStore {
	return new DrizzlePlatformReferenceStore();
}
