import type { Result } from "@afenda/errors/result";
import { z } from "zod";
import { refUomIdSchema } from "./brands";
import {
	type MasterCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import { parseMasterInput } from "./parse-input";
import type {
	RefCountry,
	RefCurrency,
	RefLanguage,
	RefTimeZone,
	RefUom,
	RefUomDimension,
} from "./types";

const codeQuerySchema = z.object({
	code: z.string().trim().min(1),
});

const ianaQuerySchema = z.object({
	ianaName: z.string().trim().min(1),
});

const uomIdQuerySchema = z.object({
	id: refUomIdSchema,
});

export async function getRefCountryByCode(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<RefCountry | null>> {
	const parsed = parseMasterInput(
		codeQuerySchema,
		input,
		"Invalid country code query",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store } = resolveCommandDeps(options);
	return store.getRefCountryByCode(parsed.data.code);
}

export async function getRefCurrencyByCode(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<RefCurrency | null>> {
	const parsed = parseMasterInput(
		codeQuerySchema,
		input,
		"Invalid currency code query",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store } = resolveCommandDeps(options);
	return store.getRefCurrencyByCode(parsed.data.code);
}

export async function getRefLanguageByCode(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<RefLanguage | null>> {
	const parsed = parseMasterInput(
		codeQuerySchema,
		input,
		"Invalid language code query",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store } = resolveCommandDeps(options);
	return store.getRefLanguageByCode(parsed.data.code);
}

export async function getRefTimeZoneByIana(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<RefTimeZone | null>> {
	const parsed = parseMasterInput(
		ianaQuerySchema,
		input,
		"Invalid time zone query",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store } = resolveCommandDeps(options);
	return store.getRefTimeZoneByIana(parsed.data.ianaName);
}

export async function getRefUomDimensionByCode(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<RefUomDimension | null>> {
	const parsed = parseMasterInput(
		codeQuerySchema,
		input,
		"Invalid UoM dimension code query",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store } = resolveCommandDeps(options);
	return store.getRefUomDimensionByCode(parsed.data.code);
}

export async function getRefUomById(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<RefUom | null>> {
	const parsed = parseMasterInput(
		uomIdQuerySchema,
		input,
		"Invalid UoM id query",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store } = resolveCommandDeps(options);
	return store.getRefUomById(parsed.data.id);
}

export async function getRefUomByCode(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<RefUom | null>> {
	const parsed = parseMasterInput(
		codeQuerySchema,
		input,
		"Invalid UoM code query",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store } = resolveCommandDeps(options);
	return store.getRefUomByCode(parsed.data.code);
}

export async function listRefUoms(
	options: MasterCommandOptions = {},
): Promise<Result<RefUom[]>> {
	const { store } = resolveCommandDeps(options);
	return store.listRefUoms();
}
