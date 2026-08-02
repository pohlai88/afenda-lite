// biome-ignore-all lint/suspicious/useAwait: Command wrappers expose one asynchronous boundary for validation failures and delegated transactions.
import { errorResult, type Result } from "@afenda/errors";
import type { CorporateAdministrationCommandOptions } from "../../command-options";
import {
	authorizeCorporateAdministrationCommand,
	type CorporateAdministrationCommandKernelDependencies,
	executeCorporateAdministrationCommand,
} from "../../internal/durable-command";
import type { LegalCompanyId, LegalEstablishmentId } from "../../kernel/brands";
import type { CanonicalDate } from "../../kernel/dates";
import { parseCorporateAdministrationInput } from "../../parse-input";
import {
	assertNoRegisteredAddressOverlap,
	normalizeEstablishmentRegistrationIdentifier,
	validateEstablishmentChronology,
	validateEstablishmentStatusTransition,
} from "../rules";
import {
	activateLegalEstablishmentInputSchema,
	closeLegalEstablishmentInputSchema,
	endPremiseInputSchema,
	legalEstablishmentSchema,
	premiseSchema,
	registeredAddressSchema,
	registerLegalEstablishmentInputSchema,
	registerPremiseInputSchema,
	setRegisteredAddressInputSchema,
	suspendLegalEstablishmentInputSchema,
	updateLegalEstablishmentInputSchema,
} from "../schemas";
import type { EstablishmentCommandDependencies } from "../store";
import type {
	ActivateLegalEstablishmentInput,
	CloseLegalEstablishmentInput,
	EndPremiseInput,
	LegalEstablishment,
	LegalEstablishmentStatus,
	Premise,
	RegisteredAddress,
	RegisterLegalEstablishmentInput,
	RegisterPremiseInput,
	SetRegisteredAddressInput,
	SuspendLegalEstablishmentInput,
	UpdateLegalEstablishmentInput,
} from "../types";

type Dependencies = EstablishmentCommandDependencies &
	CorporateAdministrationCommandKernelDependencies;

export async function registerLegalEstablishment(
	input: RegisterLegalEstablishmentInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<LegalEstablishment>> {
	const parsed = parseCorporateAdministrationInput(
		registerLegalEstablishmentInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorizeCorporateAdministrationCommand(
		"registerLegalEstablishment",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}
	const company = await dependencies.companyStore.lockLegalCompany({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		expectedVersion: parsed.data.expectedCompanyVersion,
	});
	if (!company.ok) {
		return company;
	}
	if (company.data === null) {
		return notFound("legalCompany");
	}
	if (company.data.version !== parsed.data.expectedCompanyVersion) {
		return stale(parsed.data.expectedCompanyVersion, company.data.version);
	}
	const chronology = validateEstablishmentChronology({
		registeredFrom: parsed.data.registeredFrom,
		transitionDate: parsed.data.registeredFrom,
		companyCreatedAt: company.data.createdAt,
	});
	if (!chronology.ok) {
		return chronology;
	}
	const references = await validateReferences(dependencies, {
		organizationId: options.organizationId,
		countryCode: parsed.data.jurisdictionCode,
		effectiveDate: parsed.data.registeredFrom,
		sourceDocumentId: parsed.data.sourceDocumentId,
	});
	if (!references.ok) {
		return references;
	}

	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: registerLegalEstablishmentInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: legalEstablishmentSchema,
		dependencies,
		event: {
			operationType: "CREATE",
			targetType: "ca_legal_establishment",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				legalEstablishmentId: result.id,
				establishmentType: result.establishmentType,
				jurisdictionCode: result.jurisdictionCode,
				registeredFrom: result.registeredFrom,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
			safeMetadata: { establishment_type: parsed.data.establishmentType },
		},
		serializeResult: serializeEstablishment,
		work: (transaction, context) =>
			dependencies.establishmentStore.registerLegalEstablishment({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				establishmentType: parsed.data.establishmentType,
				jurisdictionCode: parsed.data.jurisdictionCode,
				registrationIdentifier: parsed.data.registrationIdentifier,
				normalizedRegistrationIdentifier:
					normalizeEstablishmentRegistrationIdentifier(
						parsed.data.registrationIdentifier,
					),
				displayName: parsed.data.displayName,
				registeredFrom: parsed.data.registeredFrom,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				expectedCompanyVersion: parsed.data.expectedCompanyVersion,
				transaction,
			}),
	});
}

export async function updateLegalEstablishment(
	input: UpdateLegalEstablishmentInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<LegalEstablishment>> {
	const parsed = parseCorporateAdministrationInput(
		updateLegalEstablishmentInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorizeCorporateAdministrationCommand(
		"updateLegalEstablishment",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}
	const current = await dependencies.establishmentStore.getLegalEstablishment({
		organizationId: options.organizationId,
		legalEstablishmentId: parsed.data.legalEstablishmentId,
	});
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return notFound("legalEstablishment");
	}
	if (current.data.version !== parsed.data.expectedVersion) {
		return stale(parsed.data.expectedVersion, current.data.version);
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: updateLegalEstablishmentInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: legalEstablishmentSchema,
		dependencies,
		event: {
			operationType: "UPDATE",
			targetType: "ca_legal_establishment",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				legalEstablishmentId: result.id,
				profileVersion: result.version,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
		},
		serializeResult: serializeEstablishment,
		work: (transaction, context) =>
			dependencies.establishmentStore.updateLegalEstablishment({
				organizationId: options.organizationId,
				legalEstablishmentId: parsed.data.legalEstablishmentId,
				displayName: parsed.data.displayName,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

export async function activateLegalEstablishment(
	input: ActivateLegalEstablishmentInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
) {
	return transitionEstablishment(
		input,
		activateLegalEstablishmentInputSchema,
		"active",
		"activateLegalEstablishment",
		options,
		dependencies,
	);
}

export async function suspendLegalEstablishment(
	input: SuspendLegalEstablishmentInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
) {
	return transitionEstablishment(
		input,
		suspendLegalEstablishmentInputSchema,
		"suspended",
		"suspendLegalEstablishment",
		options,
		dependencies,
	);
}

export async function closeLegalEstablishment(
	input: CloseLegalEstablishmentInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
) {
	return transitionEstablishment(
		input,
		closeLegalEstablishmentInputSchema,
		"closed",
		"closeLegalEstablishment",
		options,
		dependencies,
	);
}

async function transitionEstablishment(
	input: unknown,
	schema:
		| typeof activateLegalEstablishmentInputSchema
		| typeof suspendLegalEstablishmentInputSchema
		| typeof closeLegalEstablishmentInputSchema,
	targetStatus: Exclude<LegalEstablishmentStatus, "registered">,
	commandId:
		| "activateLegalEstablishment"
		| "suspendLegalEstablishment"
		| "closeLegalEstablishment",
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<LegalEstablishment>> {
	const parsed = parseCorporateAdministrationInput(schema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorizeCorporateAdministrationCommand(
		commandId,
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}
	const current = await dependencies.establishmentStore.getLegalEstablishment({
		organizationId: options.organizationId,
		legalEstablishmentId: parsed.data.legalEstablishmentId,
	});
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return notFound("legalEstablishment");
	}
	if (current.data.version !== parsed.data.expectedVersion) {
		return stale(parsed.data.expectedVersion, current.data.version);
	}
	const transition = validateEstablishmentStatusTransition({
		from: current.data.currentStatus,
		to: targetStatus,
	});
	if (!transition.ok) {
		return transition;
	}
	const company = await dependencies.companyStore.getLegalCompany({
		organizationId: options.organizationId,
		legalCompanyId: current.data.legalCompanyId,
	});
	if (!company.ok) {
		return company;
	}
	if (company.data === null) {
		return notFound("legalCompany");
	}
	const chronology = validateEstablishmentChronology({
		registeredFrom: current.data.registeredFrom,
		transitionDate: parsed.data.effectiveFrom,
		companyCreatedAt: company.data.createdAt,
	});
	if (!chronology.ok) {
		return chronology;
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	const previousStatus = current.data.currentStatus;

	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: schema,
		fingerprintInput: parsed.data,
		outputSchema: legalEstablishmentSchema,
		dependencies,
		event: {
			operationType: "UPDATE",
			targetType: "ca_establishment_status_history",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				legalEstablishmentId: result.id,
				previousStatus,
				status: result.currentStatus,
				effectiveFrom: parsed.data.effectiveFrom,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
			safeMetadata: { status: targetStatus },
		},
		serializeResult: serializeEstablishment,
		work: (transaction, context) =>
			dependencies.establishmentStore.transitionLegalEstablishment({
				organizationId: options.organizationId,
				legalEstablishmentId: parsed.data.legalEstablishmentId,
				status: targetStatus,
				effectiveFrom: parsed.data.effectiveFrom,
				reason: parsed.data.reason,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

export async function setRegisteredAddress(
	input: SetRegisteredAddressInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<RegisteredAddress>> {
	const parsed = parseCorporateAdministrationInput(
		setRegisteredAddressInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorizeCorporateAdministrationCommand(
		"setRegisteredAddress",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}
	const prepared = await prepareAddressMutation(
		parsed.data,
		options,
		dependencies,
	);
	if (!prepared.ok) {
		return prepared;
	}
	const existing =
		await dependencies.establishmentStore.listRegisteredAddresses({
			organizationId: options.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			legalEstablishmentId: parsed.data.legalEstablishmentId ?? null,
			addressType: parsed.data.addressType,
		});
	if (!existing.ok) {
		return existing;
	}
	const overlap = assertNoRegisteredAddressOverlap({
		candidate: {
			effectiveFrom: parsed.data.effectiveFrom,
			effectiveTo: parsed.data.effectiveTo ?? null,
		},
		existing: existing.data,
	});
	if (!overlap.ok) {
		return overlap;
	}

	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: setRegisteredAddressInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: registeredAddressSchema,
		dependencies,
		event: {
			operationType: "CREATE",
			targetType: "ca_registered_address",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				legalEstablishmentId: result.legalEstablishmentId,
				registeredAddressId: result.id,
				addressType: result.addressType,
				countryCode: result.address.countryCode,
				effectiveFrom: result.effectiveFrom,
				effectiveTo: result.effectiveTo,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
			safeMetadata: { address_type: parsed.data.addressType },
		},
		serializeResult: serializeRegisteredAddress,
		work: (transaction, context) =>
			dependencies.establishmentStore.setRegisteredAddress({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				legalEstablishmentId: parsed.data.legalEstablishmentId ?? null,
				addressType: parsed.data.addressType,
				address: prepared.data.address,
				effectiveFrom: parsed.data.effectiveFrom,
				effectiveTo: parsed.data.effectiveTo ?? null,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				transaction,
			}),
	});
}

export async function registerPremise(
	input: RegisterPremiseInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<Premise>> {
	const parsed = parseCorporateAdministrationInput(
		registerPremiseInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorizeCorporateAdministrationCommand(
		"registerPremise",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}
	const prepared = await prepareAddressMutation(
		parsed.data,
		options,
		dependencies,
	);
	if (!prepared.ok) {
		return prepared;
	}

	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: registerPremiseInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: premiseSchema,
		dependencies,
		event: {
			operationType: "CREATE",
			targetType: "ca_premise",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				legalEstablishmentId: result.legalEstablishmentId,
				premiseId: result.id,
				premiseType: result.premiseType,
				countryCode: result.address.countryCode,
				effectiveFrom: result.effectiveFrom,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
		},
		serializeResult: serializePremise,
		work: (transaction, context) =>
			dependencies.establishmentStore.registerPremise({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				legalEstablishmentId: parsed.data.legalEstablishmentId ?? null,
				premiseType: parsed.data.premiseType,
				displayName: parsed.data.displayName,
				address: prepared.data.address,
				effectiveFrom: parsed.data.effectiveFrom,
				effectiveTo: parsed.data.effectiveTo ?? null,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				transaction,
			}),
	});
}

export async function endPremise(
	input: EndPremiseInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<Premise>> {
	const parsed = parseCorporateAdministrationInput(
		endPremiseInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorizeCorporateAdministrationCommand(
		"endPremise",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}
	const current = await dependencies.establishmentStore.getPremise({
		organizationId: options.organizationId,
		premiseId: parsed.data.premiseId,
	});
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return notFound("premise");
	}
	if (current.data.version !== parsed.data.expectedVersion) {
		return stale(parsed.data.expectedVersion, current.data.version);
	}
	if (
		current.data.status === "ended" ||
		parsed.data.endedOn <= current.data.effectiveFrom
	) {
		return invalidChronology("endedOn");
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}

	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: endPremiseInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: premiseSchema,
		dependencies,
		event: {
			operationType: "UPDATE",
			targetType: "ca_premise",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				premiseId: result.id,
				endedOn: result.effectiveTo,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
		},
		serializeResult: serializePremise,
		work: (transaction, context) =>
			dependencies.establishmentStore.endPremise({
				organizationId: options.organizationId,
				premiseId: parsed.data.premiseId,
				endedOn: parsed.data.endedOn,
				reason: parsed.data.reason,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

async function prepareAddressMutation(
	input: {
		legalCompanyId: LegalCompanyId;
		legalEstablishmentId?: LegalEstablishmentId | null | undefined;
		sourcePartyAddressId: string;
		effectiveFrom: CanonicalDate;
		sourceDocumentId: string;
		expectedCompanyVersion: number;
	},
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
) {
	const company = await dependencies.companyStore.lockLegalCompany({
		organizationId: options.organizationId,
		legalCompanyId: input.legalCompanyId,
		expectedVersion: input.expectedCompanyVersion,
	});
	if (!company.ok) {
		return company;
	}
	if (company.data === null) {
		return notFound("legalCompany");
	}
	if (company.data.version !== input.expectedCompanyVersion) {
		return stale(input.expectedCompanyVersion, company.data.version);
	}
	if (
		input.legalEstablishmentId !== undefined &&
		input.legalEstablishmentId !== null
	) {
		const establishment =
			await dependencies.establishmentStore.getLegalEstablishment({
				organizationId: options.organizationId,
				legalEstablishmentId: input.legalEstablishmentId,
			});
		if (!establishment.ok) {
			return establishment;
		}
		if (
			establishment.data === null ||
			establishment.data.legalCompanyId !== input.legalCompanyId
		) {
			return notFound("legalEstablishment");
		}
	}
	const address = await dependencies.addressReferences.getPartyAddress({
		organizationId: options.organizationId,
		partyId: company.data.masterDataPartyId,
		partyAddressId: input.sourcePartyAddressId,
		asOf: input.effectiveFrom,
	});
	if (!address.ok) {
		return address;
	}
	if (
		address.data === null ||
		!address.data.active ||
		address.data.organizationId !== options.organizationId ||
		address.data.partyId !== company.data.masterDataPartyId
	) {
		return notFound("partyAddress");
	}
	const country = await dependencies.referenceData.resolveCountry({
		organizationId: options.organizationId,
		countryCode: address.data.countryCode,
		effectiveDate: input.effectiveFrom,
	});
	if (!country.ok) {
		return country;
	}
	if (country.data === null || !country.data.active) {
		return invalidReference("countryCode", country.data !== null);
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		input.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return { ok: true as const, data: { address: address.data } };
}

async function validateReferences(
	dependencies: Dependencies,
	input: {
		organizationId: CorporateAdministrationCommandOptions["organizationId"];
		countryCode: string;
		effectiveDate: CanonicalDate;
		sourceDocumentId: string;
	},
) {
	const country = await dependencies.referenceData.resolveCountry({
		organizationId: input.organizationId,
		countryCode: input.countryCode,
		effectiveDate: input.effectiveDate,
	});
	if (!country.ok) {
		return country;
	}
	if (country.data === null || !country.data.active) {
		return invalidReference("jurisdictionCode", country.data !== null);
	}
	return validateSource(
		dependencies,
		input.organizationId,
		input.sourceDocumentId,
	);
}

async function validateSource(
	dependencies: Dependencies,
	organizationId: CorporateAdministrationCommandOptions["organizationId"],
	sourceDocumentId: string,
) {
	const source = await dependencies.referenceData.validateSourceDocument({
		organizationId,
		sourceDocumentId,
	});
	if (!source.ok) {
		return source;
	}
	return source.data === null || !source.data.active
		? invalidReference("sourceDocumentId", source.data !== null)
		: { ok: true as const, data: undefined };
}

function notFound(_entityType: string): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "Corporate Administration record was not found.",
	});
}

function stale(
	_expectedVersion: number,
	_actualVersion: number,
): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Corporate Administration record version is stale.",
	});
}

function invalidChronology(_field: string): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Corporate Administration chronology is invalid.",
	});
}

function invalidReference(_field: string, inactive: boolean): Result<never> {
	return inactive
		? errorResult.fail("CONFLICT", {
				publicMessage: "Corporate Administration reference is unavailable.",
			})
		: errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Corporate Administration reference is unavailable.",
			});
}

function serializeEstablishment(result: LegalEstablishment) {
	return {
		...result,
		createdAt: result.createdAt.toISOString(),
		updatedAt: result.updatedAt.toISOString(),
	};
}

function serializeRegisteredAddress(result: RegisteredAddress) {
	return { ...result, recordedAt: result.recordedAt.toISOString() };
}

function serializePremise(result: Premise) {
	return { ...result, recordedAt: result.recordedAt.toISOString() };
}
