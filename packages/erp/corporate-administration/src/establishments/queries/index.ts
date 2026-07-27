import { fail, type Result } from "@afenda/errors/result";

import {
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../../authorization";
import type { CorporateAdministrationQueryOptions } from "../../command-options";
import { corporateAdministrationErrorDetails } from "../../error-codes";
import { toCanonicalInstant } from "../../kernel/dates";
import { parseCorporateAdministrationInput } from "../../parse-input";
import {
	findRegisteredAddressAsOfInputSchema,
	getLegalEstablishmentInputSchema,
	listLegalEstablishmentsAsOfInputSchema,
	listPremisesAsOfInputSchema,
} from "../schemas";
import type { EstablishmentQueryDependencies } from "../store";
import type {
	FindRegisteredAddressAsOfInput,
	GetLegalEstablishmentInput,
	LegalEstablishment,
	ListLegalEstablishmentsAsOfInput,
	ListPremisesAsOfInput,
	Premise,
	RegisteredAddress,
} from "../types";

export async function getLegalEstablishment(
	input: GetLegalEstablishmentInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: EstablishmentQueryDependencies,
): Promise<Result<LegalEstablishment>> {
	const parsed = parseCorporateAdministrationInput(
		getLegalEstablishmentInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;
	const authorized = await authorize(options, "getLegalEstablishment");
	if (!authorized.ok) return authorized;
	const result = await dependencies.establishmentStore.getLegalEstablishment({
		organizationId: options.organizationId,
		legalEstablishmentId: parsed.data.legalEstablishmentId,
	});
	if (!result.ok) return result;
	return result.data === null
		? notFound("legalEstablishment")
		: { ok: true, data: result.data };
}

export async function listLegalEstablishmentsAsOf(
	input: ListLegalEstablishmentsAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: EstablishmentQueryDependencies,
): Promise<Result<readonly LegalEstablishment[]>> {
	const parsed = parseCorporateAdministrationInput(
		listLegalEstablishmentsAsOfInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;
	const authorized = await authorize(options, "listLegalEstablishmentsAsOf");
	if (!authorized.ok) return authorized;
	return dependencies.establishmentStore.listLegalEstablishmentsAsOf({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		asOf: parsed.data.asOf,
		knownAt:
			parsed.data.knownAt === undefined
				? undefined
				: toCanonicalInstant(parsed.data.knownAt),
		status: parsed.data.status,
	});
}

export async function findRegisteredAddressAsOf(
	input: FindRegisteredAddressAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: EstablishmentQueryDependencies,
): Promise<Result<RegisteredAddress | null>> {
	const parsed = parseCorporateAdministrationInput(
		findRegisteredAddressAsOfInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;
	const authorized = await authorize(options, "findRegisteredAddressAsOf");
	if (!authorized.ok) return authorized;
	return dependencies.establishmentStore.findRegisteredAddressAsOf({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		legalEstablishmentId: parsed.data.legalEstablishmentId ?? null,
		addressType: parsed.data.addressType,
		asOf: parsed.data.asOf,
		knownAt:
			parsed.data.knownAt === undefined
				? undefined
				: toCanonicalInstant(parsed.data.knownAt),
	});
}

export async function listPremisesAsOf(
	input: ListPremisesAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: EstablishmentQueryDependencies,
): Promise<Result<readonly Premise[]>> {
	const parsed = parseCorporateAdministrationInput(
		listPremisesAsOfInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;
	const authorized = await authorize(options, "listPremisesAsOf");
	if (!authorized.ok) return authorized;
	return dependencies.establishmentStore.listPremisesAsOf({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		legalEstablishmentId: parsed.data.legalEstablishmentId,
		premiseType: parsed.data.premiseType,
		asOf: parsed.data.asOf,
		knownAt:
			parsed.data.knownAt === undefined
				? undefined
				: toCanonicalInstant(parsed.data.knownAt),
	});
}

function authorize(
	options: CorporateAdministrationQueryOptions,
	query: keyof typeof CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
) {
	return requireCorporateAdministrationPermission(options.authorization, {
		organizationId: options.organizationId,
		actorUserId: options.actorUserId,
		permission: CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS[query],
	});
}

function notFound(entityType: string): Result<never> {
	return fail(
		"NOT_FOUND",
		"Corporate Administration record was not found.",
		corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_NOT_FOUND", {
			entityType,
		}),
	);
}
