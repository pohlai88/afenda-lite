import { errorResult, type Result } from "@afenda/errors";

import type { CorporateAdministrationQueryOptions } from "../../command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../../internal/query";
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

type Dependencies = EstablishmentQueryDependencies &
	CorporateAdministrationQueryKernelDependencies;

export async function getLegalEstablishment(
	input: GetLegalEstablishmentInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: Dependencies,
): Promise<Result<LegalEstablishment>> {
	const parsed = parseCorporateAdministrationInput(
		getLegalEstablishmentInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery<LegalEstablishment>({
		operationId: "getLegalEstablishment",
		options,
		dependencies,
		work: async () => {
			const result =
				await dependencies.establishmentStore.getLegalEstablishment({
					organizationId: options.organizationId,
					legalEstablishmentId: parsed.data.legalEstablishmentId,
				});
			if (!result.ok) {
				return result;
			}
			return result.data === null
				? notFound("legalEstablishment")
				: { ok: true, data: result.data };
		},
	});
}

export async function listLegalEstablishmentsAsOf(
	input: ListLegalEstablishmentsAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: Dependencies,
): Promise<Result<readonly LegalEstablishment[]>> {
	const parsed = parseCorporateAdministrationInput(
		listLegalEstablishmentsAsOfInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery({
		operationId: "listLegalEstablishmentsAsOf",
		options,
		dependencies,
		work: () =>
			dependencies.establishmentStore.listLegalEstablishmentsAsOf({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				asOf: parsed.data.asOf,
				knownAt:
					parsed.data.knownAt === undefined
						? undefined
						: toCanonicalInstant(parsed.data.knownAt),
				status: parsed.data.status,
			}),
	});
}

export async function findRegisteredAddressAsOf(
	input: FindRegisteredAddressAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: Dependencies,
): Promise<Result<RegisteredAddress | null>> {
	const parsed = parseCorporateAdministrationInput(
		findRegisteredAddressAsOfInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery({
		operationId: "findRegisteredAddressAsOf",
		options,
		dependencies,
		work: () =>
			dependencies.establishmentStore.findRegisteredAddressAsOf({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				legalEstablishmentId: parsed.data.legalEstablishmentId ?? null,
				addressType: parsed.data.addressType,
				asOf: parsed.data.asOf,
				knownAt:
					parsed.data.knownAt === undefined
						? undefined
						: toCanonicalInstant(parsed.data.knownAt),
			}),
	});
}

export async function listPremisesAsOf(
	input: ListPremisesAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: Dependencies,
): Promise<Result<readonly Premise[]>> {
	const parsed = parseCorporateAdministrationInput(
		listPremisesAsOfInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery({
		operationId: "listPremisesAsOf",
		options,
		dependencies,
		work: () =>
			dependencies.establishmentStore.listPremisesAsOf({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				legalEstablishmentId: parsed.data.legalEstablishmentId,
				premiseType: parsed.data.premiseType,
				asOf: parsed.data.asOf,
				knownAt:
					parsed.data.knownAt === undefined
						? undefined
						: toCanonicalInstant(parsed.data.knownAt),
			}),
	});
}

function notFound(_entityType: string): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "Corporate Administration record was not found.",
	});
}
