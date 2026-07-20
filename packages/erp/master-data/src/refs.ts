import type { Result } from "@afenda/errors/result";
import { z } from "zod";
import { requireMasterQueryPermission } from "./authorization";
import { refUomIdSchema } from "./brands";
import {
	type MasterCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import { orgQueryActorSchema } from "./contracts/context";
import {
	MASTER_QUERY_REF_COUNTRY_GET_BY_CODE,
	MASTER_QUERY_REF_CURRENCY_GET_BY_CODE,
	MASTER_QUERY_REF_LANGUAGE_GET_BY_CODE,
	MASTER_QUERY_REF_TIME_ZONE_GET_BY_IANA,
	MASTER_QUERY_REF_UOM_DIMENSION_GET_BY_CODE,
	MASTER_QUERY_REF_UOM_GET_BY_CODE,
	MASTER_QUERY_REF_UOM_GET_BY_ID,
	MASTER_QUERY_REF_UOM_LIST,
	type MasterQueryId,
} from "./module-ids";
import { parseMasterInput } from "./parse-input";
import type {
	RefCountry,
	RefCurrency,
	RefLanguage,
	RefTimeZone,
	RefUom,
	RefUomDimension,
} from "./types";

const codeQuerySchema = orgQueryActorSchema.extend({
	code: z.string().trim().min(1),
});

const ianaQuerySchema = orgQueryActorSchema.extend({
	ianaName: z.string().trim().min(1),
});

const uomIdQuerySchema = orgQueryActorSchema.extend({
	id: refUomIdSchema,
});

const listRefUomsQuerySchema = orgQueryActorSchema;

async function authorizeRefQuery(
	options: MasterCommandOptions,
	input: { organizationId: string; actorUserId: string },
	query: MasterQueryId,
): Promise<Result<void>> {
	const { authorization } = resolveCommandDeps(options);
	return requireMasterQueryPermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		query,
	});
}

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
	const authorized = await authorizeRefQuery(
		options,
		parsed.data,
		MASTER_QUERY_REF_COUNTRY_GET_BY_CODE,
	);
	if (!authorized.ok) {
		return authorized;
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
	const authorized = await authorizeRefQuery(
		options,
		parsed.data,
		MASTER_QUERY_REF_CURRENCY_GET_BY_CODE,
	);
	if (!authorized.ok) {
		return authorized;
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
	const authorized = await authorizeRefQuery(
		options,
		parsed.data,
		MASTER_QUERY_REF_LANGUAGE_GET_BY_CODE,
	);
	if (!authorized.ok) {
		return authorized;
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
	const authorized = await authorizeRefQuery(
		options,
		parsed.data,
		MASTER_QUERY_REF_TIME_ZONE_GET_BY_IANA,
	);
	if (!authorized.ok) {
		return authorized;
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
	const authorized = await authorizeRefQuery(
		options,
		parsed.data,
		MASTER_QUERY_REF_UOM_DIMENSION_GET_BY_CODE,
	);
	if (!authorized.ok) {
		return authorized;
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
	const authorized = await authorizeRefQuery(
		options,
		parsed.data,
		MASTER_QUERY_REF_UOM_GET_BY_ID,
	);
	if (!authorized.ok) {
		return authorized;
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
	const authorized = await authorizeRefQuery(
		options,
		parsed.data,
		MASTER_QUERY_REF_UOM_GET_BY_CODE,
	);
	if (!authorized.ok) {
		return authorized;
	}
	const { store } = resolveCommandDeps(options);
	return store.getRefUomByCode(parsed.data.code);
}

export async function listRefUoms(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<RefUom[]>> {
	const parsed = parseMasterInput(
		listRefUomsQuerySchema,
		input,
		"Invalid UoM list query",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorizeRefQuery(
		options,
		parsed.data,
		MASTER_QUERY_REF_UOM_LIST,
	);
	if (!authorized.ok) {
		return authorized;
	}
	const { store } = resolveCommandDeps(options);
	return store.listRefUoms();
}
