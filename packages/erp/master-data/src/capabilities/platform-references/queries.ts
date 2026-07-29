import { ok, type Result } from "@afenda/errors/result";
import type { z } from "zod";
import {
	failInvalidReference,
	failReferenceNotFound,
} from "./reference-errors";
import {
	getRefCountryByCodeInputSchema,
	getRefCountryInputSchema,
	getRefCurrencyByCodeInputSchema,
	getRefCurrencyInputSchema,
	getRefLanguageByCodeInputSchema,
	getRefLanguageInputSchema,
	getRefTimeZoneByCodeInputSchema,
	getRefTimeZoneInputSchema,
	getRefUomByCodeInputSchema,
	getRefUomDimensionByCodeInputSchema,
	getRefUomDimensionInputSchema,
	getRefUomInputSchema,
	listRefCountriesInputSchema,
	listRefCurrenciesInputSchema,
	listRefLanguagesInputSchema,
	listRefTimeZonesInputSchema,
	listRefUomDimensionsInputSchema,
	listRefUomsByDimensionInputSchema,
	listRefUomsInputSchema,
} from "./schemas";
import type { PlatformReferenceStore } from "./store";
import type {
	ListPage,
	RefCountry,
	RefCurrency,
	RefLanguage,
	RefTimeZone,
	RefUom,
	RefUomDimension,
} from "./types";

function parseReferenceInput<TSchema extends z.ZodType>(
	schema: TSchema,
	input: unknown,
	referenceFamily: string,
): Result<z.infer<TSchema>> {
	const parsed = schema.safeParse(input);
	return parsed.success
		? ok(parsed.data)
		: failInvalidReference(referenceFamily);
}

function hasReferenceStatusFilter(input: unknown): boolean {
	return (
		typeof input === "object" &&
		input !== null &&
		"status" in input &&
		readProperty(input, "status") !== undefined
	);
}

function readProperty(input: object, key: PropertyKey): unknown {
	try {
		return Reflect.get(input, key);
	} catch {
		return undefined;
	}
}

export async function readRefCountry(
	store: Pick<PlatformReferenceStore, "getCountryById">,
	input: unknown,
): Promise<Result<RefCountry>> {
	const parsed = parseReferenceInput(
		getRefCountryInputSchema,
		input,
		"country",
	);
	if (!parsed.ok) return parsed;
	const row = await store.getCountryById(parsed.data.id);
	return row === null ? failReferenceNotFound("country") : ok(row);
}

export async function readRefCountryByCode(
	store: Pick<PlatformReferenceStore, "getCountryByCode">,
	input: unknown,
): Promise<Result<RefCountry>> {
	const parsed = parseReferenceInput(
		getRefCountryByCodeInputSchema,
		input,
		"country",
	);
	if (!parsed.ok) return parsed;
	const row = await store.getCountryByCode(parsed.data.code);
	return row === null ? failReferenceNotFound("country") : ok(row);
}

export async function readRefCountries(
	store: Pick<PlatformReferenceStore, "listCountries">,
	input: unknown,
): Promise<Result<ListPage<RefCountry>>> {
	const parsed = parseReferenceInput(
		listRefCountriesInputSchema,
		input,
		"country",
	);
	if (!parsed.ok) return parsed;
	return ok(await store.listCountries(parsed.data));
}

export async function readRefCurrency(
	store: Pick<PlatformReferenceStore, "getCurrencyById">,
	input: unknown,
): Promise<Result<RefCurrency>> {
	const parsed = parseReferenceInput(
		getRefCurrencyInputSchema,
		input,
		"currency",
	);
	if (!parsed.ok) return parsed;
	const row = await store.getCurrencyById(parsed.data.id);
	return row === null ? failReferenceNotFound("currency") : ok(row);
}

export async function readRefCurrencyByCode(
	store: Pick<PlatformReferenceStore, "getCurrencyByCode">,
	input: unknown,
): Promise<Result<RefCurrency>> {
	const parsed = parseReferenceInput(
		getRefCurrencyByCodeInputSchema,
		input,
		"currency",
	);
	if (!parsed.ok) return parsed;
	const row = await store.getCurrencyByCode(parsed.data.code);
	return row === null ? failReferenceNotFound("currency") : ok(row);
}

export async function readRefCurrencies(
	store: Pick<PlatformReferenceStore, "listCurrencies">,
	input: unknown,
): Promise<Result<ListPage<RefCurrency>>> {
	const parsed = parseReferenceInput(
		listRefCurrenciesInputSchema,
		input,
		"currency",
	);
	if (!parsed.ok) return parsed;
	return ok(await store.listCurrencies(parsed.data));
}

export async function readRefLanguage(
	store: Pick<PlatformReferenceStore, "getLanguageById">,
	input: unknown,
): Promise<Result<RefLanguage>> {
	const parsed = parseReferenceInput(
		getRefLanguageInputSchema,
		input,
		"language",
	);
	if (!parsed.ok) return parsed;
	const row = await store.getLanguageById(parsed.data.id);
	return row === null ? failReferenceNotFound("language") : ok(row);
}

export async function readRefLanguageByCode(
	store: Pick<PlatformReferenceStore, "getLanguageByCode">,
	input: unknown,
): Promise<Result<RefLanguage>> {
	const parsed = parseReferenceInput(
		getRefLanguageByCodeInputSchema,
		input,
		"language",
	);
	if (!parsed.ok) return parsed;
	const row = await store.getLanguageByCode(parsed.data.code);
	return row === null ? failReferenceNotFound("language") : ok(row);
}

export async function readRefLanguages(
	store: Pick<PlatformReferenceStore, "listLanguages">,
	input: unknown,
): Promise<Result<ListPage<RefLanguage>>> {
	const parsed = parseReferenceInput(
		listRefLanguagesInputSchema,
		input,
		"language",
	);
	if (!parsed.ok) return parsed;
	return ok(await store.listLanguages(parsed.data));
}

export async function readRefTimeZone(
	store: Pick<PlatformReferenceStore, "getTimeZoneById">,
	input: unknown,
): Promise<Result<RefTimeZone>> {
	const parsed = parseReferenceInput(
		getRefTimeZoneInputSchema,
		input,
		"time_zone",
	);
	if (!parsed.ok) return parsed;
	const row = await store.getTimeZoneById(parsed.data.id);
	return row === null ? failReferenceNotFound("time_zone") : ok(row);
}

export async function readRefTimeZoneByCode(
	store: Pick<PlatformReferenceStore, "getTimeZoneByCode">,
	input: unknown,
): Promise<Result<RefTimeZone>> {
	const parsed = parseReferenceInput(
		getRefTimeZoneByCodeInputSchema,
		input,
		"time_zone",
	);
	if (!parsed.ok) return parsed;
	const row = await store.getTimeZoneByCode(parsed.data.code);
	return row === null ? failReferenceNotFound("time_zone") : ok(row);
}

export async function readRefTimeZones(
	store: Pick<PlatformReferenceStore, "listTimeZones">,
	input: unknown,
): Promise<Result<ListPage<RefTimeZone>>> {
	const parsed = parseReferenceInput(
		listRefTimeZonesInputSchema,
		input,
		"time_zone",
	);
	if (!parsed.ok) return parsed;
	return ok(await store.listTimeZones(parsed.data));
}

export async function readRefUomDimension(
	store: Pick<PlatformReferenceStore, "getUomDimensionById">,
	input: unknown,
): Promise<Result<RefUomDimension>> {
	const parsed = parseReferenceInput(
		getRefUomDimensionInputSchema,
		input,
		"uom_dimension",
	);
	if (!parsed.ok) return parsed;
	const row = await store.getUomDimensionById(parsed.data.id);
	return row === null ? failReferenceNotFound("uom_dimension") : ok(row);
}

export async function readRefUomDimensionByCode(
	store: Pick<PlatformReferenceStore, "getUomDimensionByCode">,
	input: unknown,
): Promise<Result<RefUomDimension>> {
	const parsed = parseReferenceInput(
		getRefUomDimensionByCodeInputSchema,
		input,
		"uom_dimension",
	);
	if (!parsed.ok) return parsed;
	const row = await store.getUomDimensionByCode(parsed.data.code);
	return row === null ? failReferenceNotFound("uom_dimension") : ok(row);
}

export async function readRefUomDimensions(
	store: Pick<PlatformReferenceStore, "listUomDimensions">,
	input: unknown,
): Promise<Result<ListPage<RefUomDimension>>> {
	if (hasReferenceStatusFilter(input)) {
		return failInvalidReference("uom_dimension");
	}
	const parsed = parseReferenceInput(
		listRefUomDimensionsInputSchema,
		input,
		"uom_dimension",
	);
	if (!parsed.ok) return parsed;
	return ok(await store.listUomDimensions(parsed.data));
}

export async function readRefUom(
	store: Pick<PlatformReferenceStore, "getUomById">,
	input: unknown,
): Promise<Result<RefUom>> {
	const parsed = parseReferenceInput(getRefUomInputSchema, input, "uom");
	if (!parsed.ok) return parsed;
	const row = await store.getUomById(parsed.data.id);
	return row === null ? failReferenceNotFound("uom") : ok(row);
}

export async function readRefUomByCode(
	store: Pick<PlatformReferenceStore, "getUomByCode">,
	input: unknown,
): Promise<Result<RefUom>> {
	const parsed = parseReferenceInput(getRefUomByCodeInputSchema, input, "uom");
	if (!parsed.ok) return parsed;
	const row = await store.getUomByCode(parsed.data.code);
	return row === null ? failReferenceNotFound("uom") : ok(row);
}

export async function readRefUoms(
	store: Pick<PlatformReferenceStore, "listUoms">,
	input: unknown,
): Promise<Result<ListPage<RefUom>>> {
	const parsed = parseReferenceInput(listRefUomsInputSchema, input, "uom");
	if (!parsed.ok) return parsed;
	return ok(await store.listUoms(parsed.data));
}

export async function readRefUomsByDimension(
	store: Pick<PlatformReferenceStore, "listUomsByDimension">,
	input: unknown,
): Promise<Result<ListPage<RefUom>>> {
	const parsed = parseReferenceInput(
		listRefUomsByDimensionInputSchema,
		input,
		"uom",
	);
	if (!parsed.ok) return parsed;
	return ok(await store.listUomsByDimension(parsed.data));
}

export const getRefCountry = readRefCountry;
export const getRefCurrency = readRefCurrency;
export const getRefLanguage = readRefLanguage;
export const getRefTimeZone = readRefTimeZone;
export const getRefUomDimension = readRefUomDimension;
export const getRefUom = readRefUom;
export const listRefCountries = readRefCountries;
export const listRefCurrencies = readRefCurrencies;
export const listRefLanguages = readRefLanguages;
export const listRefTimeZones = readRefTimeZones;
export const listRefUomDimensions = readRefUomDimensions;
export const listRefUoms = readRefUoms;
