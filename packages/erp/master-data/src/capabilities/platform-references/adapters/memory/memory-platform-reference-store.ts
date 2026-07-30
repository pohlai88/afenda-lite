import { resolveAsync } from "../../../../resolve-async";
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

interface CodeNameReference {
	code: string;
	name: string;
}

function clone<TReference extends object>(row: TReference): TReference {
	return { ...row };
}

function matchesStatus(
	row: { active: boolean },
	status: "active" | "inactive" | "all",
): boolean {
	if (status === "all") {
		return true;
	}
	return status === "active" ? row.active : !row.active;
}

function matchesCodeNameSearch(
	row: CodeNameReference,
	search?: string,
): boolean {
	if (search === undefined) {
		return true;
	}
	const normalized = search.toLowerCase();
	return (
		row.code.toLowerCase().includes(normalized) ||
		row.name.toLowerCase().includes(normalized)
	);
}

function matchesTimeZoneSearch(row: RefTimeZone, search?: string): boolean {
	if (search === undefined) {
		return true;
	}
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
		for (const row of seed.countries ?? []) {
			this.countries.set(row.id, clone(row));
		}
		for (const row of seed.currencies ?? []) {
			this.currencies.set(row.id, clone(row));
		}
		for (const row of seed.languages ?? []) {
			this.languages.set(row.id, clone(row));
		}
		for (const row of seed.timeZones ?? []) {
			this.timeZones.set(row.id, clone(row));
		}
		for (const row of seed.uomDimensions ?? []) {
			this.uomDimensions.set(row.id, clone(row));
		}
		for (const row of seed.uoms ?? []) {
			this.uoms.set(row.id, clone(row));
		}
	}

	getCountryById(id: RefCountryId): Promise<RefCountry | null> {
		return resolveAsync(() => this.cloneFrom(this.countries, id));
	}

	getCountryByCode(code: CountryCode): Promise<RefCountry | null> {
		return resolveAsync(() => this.findByCode(this.countries.values(), code));
	}

	listCountries(input: ListRefCountriesInput): Promise<ListPage<RefCountry>> {
		return resolveAsync(() => {
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
		});
	}

	getCurrencyById(id: RefCurrencyId): Promise<RefCurrency | null> {
		return resolveAsync(() => this.cloneFrom(this.currencies, id));
	}

	getCurrencyByCode(code: CurrencyCode): Promise<RefCurrency | null> {
		return resolveAsync(() => this.findByCode(this.currencies.values(), code));
	}

	listCurrencies(
		input: ListRefCurrenciesInput,
	): Promise<ListPage<RefCurrency>> {
		return resolveAsync(() => {
			const rows = [...this.currencies.values()]
				.filter(
					(row) =>
						matchesStatus(row, input.status) &&
						matchesCodeNameSearch(row, input.search),
				)
				.sort((left, right) => left.code.localeCompare(right.code))
				.map(clone);
			return pageFromCursor(rows, input);
		});
	}

	getLanguageById(id: RefLanguageId): Promise<RefLanguage | null> {
		return resolveAsync(() => this.cloneFrom(this.languages, id));
	}

	getLanguageByCode(code: LanguageCode): Promise<RefLanguage | null> {
		return resolveAsync(() => this.findByCode(this.languages.values(), code));
	}

	listLanguages(input: ListRefLanguagesInput): Promise<ListPage<RefLanguage>> {
		return resolveAsync(() => {
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
		});
	}

	getTimeZoneById(id: RefTimeZoneId): Promise<RefTimeZone | null> {
		return resolveAsync(() => this.cloneFrom(this.timeZones, id));
	}

	getTimeZoneByCode(code: TimeZoneCode): Promise<RefTimeZone | null> {
		return resolveAsync(() => {
			for (const row of this.timeZones.values()) {
				if (row.ianaName === code) {
					return clone(row);
				}
			}
			return null;
		});
	}

	listTimeZones(input: ListRefTimeZonesInput): Promise<ListPage<RefTimeZone>> {
		return resolveAsync(() => {
			const rows = [...this.timeZones.values()]
				.filter(
					(row) =>
						matchesStatus(row, input.status) &&
						matchesTimeZoneSearch(row, input.search),
				)
				.sort((left, right) => left.ianaName.localeCompare(right.ianaName))
				.map(clone);
			return pageFromCursor(rows, input);
		});
	}

	getUomDimensionById(id: RefUomDimensionId): Promise<RefUomDimension | null> {
		return resolveAsync(() => this.cloneFrom(this.uomDimensions, id));
	}

	getUomDimensionByCode(
		code: UomDimensionCode,
	): Promise<RefUomDimension | null> {
		return resolveAsync(() =>
			this.findByCode(this.uomDimensions.values(), code),
		);
	}

	listUomDimensions(
		input: ListRefUomDimensionsInput,
	): Promise<ListPage<RefUomDimension>> {
		return resolveAsync(() => {
			const rows = [...this.uomDimensions.values()]
				.filter((row) => matchesCodeNameSearch(row, input.search))
				.sort((left, right) =>
					left.name === right.name
						? left.code.localeCompare(right.code)
						: left.name.localeCompare(right.name),
				)
				.map(clone);
			return pageFromCursor(rows, input);
		});
	}

	getUomById(id: RefUomId): Promise<RefUom | null> {
		return resolveAsync(() => this.cloneFrom(this.uoms, id));
	}

	getUomByCode(code: UomCode): Promise<RefUom | null> {
		return resolveAsync(() => this.findByCode(this.uoms.values(), code));
	}

	listUoms(input: ListRefUomsInput): Promise<ListPage<RefUom>> {
		return resolveAsync(() => {
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
					if (byDimension !== 0) {
						return byDimension;
					}
					if (left.name !== right.name) {
						return left.name.localeCompare(right.name);
					}
					return left.code.localeCompare(right.code);
				})
				.map(clone);
			return pageFromCursor(rows, input);
		});
	}

	listUomsByDimension(
		input: ListRefUomsByDimensionInput,
	): Promise<ListPage<RefUom>> {
		return resolveAsync(() => {
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
		});
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
			if (row.code === code) {
				return clone(row);
			}
		}
		return null;
	}
}
