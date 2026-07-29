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
import type { PlatformReferenceStore } from "../../store";
import type {
	ListPage,
	MemoryPlatformReferenceSeed,
	RefCountry,
	RefCurrency,
	RefLanguage,
	RefTimeZone,
	RefUom,
	RefUomDimension,
} from "../../types";

type CodeNameReference = { code: string; name: string };

function clone<TReference extends object>(row: TReference): TReference {
	return { ...row };
}

function matchesStatus(
	row: { active: boolean },
	status: "active" | "inactive" | "all",
): boolean {
	if (status === "all") return true;
	return status === "active" ? row.active : !row.active;
}

function matchesCodeNameSearch(
	row: CodeNameReference,
	search?: string,
): boolean {
	if (search === undefined) return true;
	const normalized = search.toLowerCase();
	return (
		row.code.toLowerCase().includes(normalized) ||
		row.name.toLowerCase().includes(normalized)
	);
}

function matchesTimeZoneSearch(row: RefTimeZone, search?: string): boolean {
	if (search === undefined) return true;
	const normalized = search.toLowerCase();
	return (
		row.ianaName.toLowerCase().includes(normalized) ||
		row.name.toLowerCase().includes(normalized)
	);
}

function pageFromCursor<TItem>(
	rows: TItem[],
	input: { cursor?: string | undefined; pageSize: number },
): ListPage<TItem> {
	const offset =
		input.cursor === undefined ? 0 : Number.parseInt(input.cursor, 10);
	const items = rows.slice(offset, offset + input.pageSize);
	const nextOffset = offset + input.pageSize;
	return nextOffset < rows.length
		? { items, nextCursor: String(nextOffset) }
		: { items };
}

export class MemoryPlatformReferenceStore implements PlatformReferenceStore {
	private readonly countries = new Map<RefCountryId, RefCountry>();
	private readonly currencies = new Map<RefCurrencyId, RefCurrency>();
	private readonly languages = new Map<RefLanguageId, RefLanguage>();
	private readonly timeZones = new Map<RefTimeZoneId, RefTimeZone>();
	private readonly uomDimensions = new Map<
		RefUomDimensionId,
		RefUomDimension
	>();
	private readonly uoms = new Map<RefUomId, RefUom>();

	constructor(seed: MemoryPlatformReferenceSeed = {}) {
		this.seed(seed);
	}

	seed(seed: MemoryPlatformReferenceSeed): void {
		for (const row of seed.countries ?? [])
			this.countries.set(row.id, clone(row));
		for (const row of seed.currencies ?? [])
			this.currencies.set(row.id, clone(row));
		for (const row of seed.languages ?? [])
			this.languages.set(row.id, clone(row));
		for (const row of seed.timeZones ?? [])
			this.timeZones.set(row.id, clone(row));
		for (const row of seed.uomDimensions ?? []) {
			this.uomDimensions.set(row.id, clone(row));
		}
		for (const row of seed.uoms ?? []) this.uoms.set(row.id, clone(row));
	}

	async getCountryById(id: RefCountryId): Promise<RefCountry | null> {
		return this.cloneFrom(this.countries, id);
	}

	async getCountryByCode(code: CountryCode): Promise<RefCountry | null> {
		return this.findByCode(this.countries.values(), code);
	}

	async listCountries(
		input: ListRefCountriesInput,
	): Promise<ListPage<RefCountry>> {
		const rows = [...this.countries.values()]
			.filter(
				(row) =>
					matchesStatus(row, input.status) &&
					matchesCodeNameSearch(row, input.search),
			)
			.sort((left, right) =>
				left.name === right.name
					? left.code.localeCompare(right.code)
					: left.name.localeCompare(right.name),
			)
			.map(clone);
		return pageFromCursor(rows, input);
	}

	async getCurrencyById(id: RefCurrencyId): Promise<RefCurrency | null> {
		return this.cloneFrom(this.currencies, id);
	}

	async getCurrencyByCode(code: CurrencyCode): Promise<RefCurrency | null> {
		return this.findByCode(this.currencies.values(), code);
	}

	async listCurrencies(
		input: ListRefCurrenciesInput,
	): Promise<ListPage<RefCurrency>> {
		const rows = [...this.currencies.values()]
			.filter(
				(row) =>
					matchesStatus(row, input.status) &&
					matchesCodeNameSearch(row, input.search),
			)
			.sort((left, right) => left.code.localeCompare(right.code))
			.map(clone);
		return pageFromCursor(rows, input);
	}

	async getLanguageById(id: RefLanguageId): Promise<RefLanguage | null> {
		return this.cloneFrom(this.languages, id);
	}

	async getLanguageByCode(code: LanguageCode): Promise<RefLanguage | null> {
		return this.findByCode(this.languages.values(), code);
	}

	async listLanguages(
		input: ListRefLanguagesInput,
	): Promise<ListPage<RefLanguage>> {
		const rows = [...this.languages.values()]
			.filter(
				(row) =>
					matchesStatus(row, input.status) &&
					matchesCodeNameSearch(row, input.search),
			)
			.sort((left, right) =>
				left.name === right.name
					? left.code.localeCompare(right.code)
					: left.name.localeCompare(right.name),
			)
			.map(clone);
		return pageFromCursor(rows, input);
	}

	async getTimeZoneById(id: RefTimeZoneId): Promise<RefTimeZone | null> {
		return this.cloneFrom(this.timeZones, id);
	}

	async getTimeZoneByCode(code: TimeZoneCode): Promise<RefTimeZone | null> {
		for (const row of this.timeZones.values()) {
			if (row.ianaName === code) return clone(row);
		}
		return null;
	}

	async listTimeZones(
		input: ListRefTimeZonesInput,
	): Promise<ListPage<RefTimeZone>> {
		const rows = [...this.timeZones.values()]
			.filter(
				(row) =>
					matchesStatus(row, input.status) &&
					matchesTimeZoneSearch(row, input.search),
			)
			.sort((left, right) => left.ianaName.localeCompare(right.ianaName))
			.map(clone);
		return pageFromCursor(rows, input);
	}

	async getUomDimensionById(
		id: RefUomDimensionId,
	): Promise<RefUomDimension | null> {
		return this.cloneFrom(this.uomDimensions, id);
	}

	async getUomDimensionByCode(
		code: UomDimensionCode,
	): Promise<RefUomDimension | null> {
		return this.findByCode(this.uomDimensions.values(), code);
	}

	async listUomDimensions(
		input: ListRefUomDimensionsInput,
	): Promise<ListPage<RefUomDimension>> {
		const rows = [...this.uomDimensions.values()]
			.filter((row) => matchesCodeNameSearch(row, input.search))
			.sort((left, right) =>
				left.name === right.name
					? left.code.localeCompare(right.code)
					: left.name.localeCompare(right.name),
			)
			.map(clone);
		return pageFromCursor(rows, input);
	}

	async getUomById(id: RefUomId): Promise<RefUom | null> {
		return this.cloneFrom(this.uoms, id);
	}

	async getUomByCode(code: UomCode): Promise<RefUom | null> {
		return this.findByCode(this.uoms.values(), code);
	}

	async listUoms(input: ListRefUomsInput): Promise<ListPage<RefUom>> {
		const dimensionNameById = new Map(
			[...this.uomDimensions.values()].map((row) => [row.id, row.name]),
		);
		const rows = [...this.uoms.values()]
			.filter(
				(row) =>
					matchesStatus(row, input.status) &&
					matchesCodeNameSearch(row, input.search),
			)
			.sort((left, right) => {
				const byDimension = (
					dimensionNameById.get(left.dimensionId) ?? ""
				).localeCompare(dimensionNameById.get(right.dimensionId) ?? "");
				if (byDimension !== 0) return byDimension;
				if (left.name !== right.name)
					return left.name.localeCompare(right.name);
				return left.code.localeCompare(right.code);
			})
			.map(clone);
		return pageFromCursor(rows, input);
	}

	async listUomsByDimension(
		input: ListRefUomsByDimensionInput,
	): Promise<ListPage<RefUom>> {
		const rows = [...this.uoms.values()]
			.filter(
				(row) =>
					row.dimensionId === input.dimensionId &&
					matchesStatus(row, input.status) &&
					matchesCodeNameSearch(row, input.search),
			)
			.sort((left, right) =>
				left.name === right.name
					? left.code.localeCompare(right.code)
					: left.name.localeCompare(right.name),
			)
			.map(clone);
		return pageFromCursor(rows, input);
	}

	private cloneFrom<TKey, TValue extends object>(
		rows: ReadonlyMap<TKey, TValue>,
		key: TKey,
	): TValue | null {
		const row = rows.get(key);
		return row === undefined ? null : clone(row);
	}

	private findByCode<TReference extends CodeNameReference>(
		rows: Iterable<TReference>,
		code: string,
	): TReference | null {
		for (const row of rows) {
			if (row.code === code) return clone(row);
		}
		return null;
	}
}
