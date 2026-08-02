// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Identifier registration coordinates policy, idempotency, audit, and outbox atomically.
// biome-ignore-all lint/style/useDestructuring: Explicit company state access keeps command evidence visible.
import { errorResult, type Result } from "@afenda/errors";
import type { CorporateAdministrationApprovalVerificationDependencies } from "../../authorization";
import type {
	CorporateAdministrationApprovalCommandOptions,
	CorporateAdministrationCommandOptions,
} from "../../command-options";
import {
	authorizeCorporateAdministrationCommand,
	type CorporateAdministrationCommandKernelDependencies,
	executeCorporateAdministrationCommand,
} from "../../internal/durable-command";
import { parseCorporateAdministrationInput } from "../../parse-input";
import {
	assertNonTaxCompanyIdentifierType,
	normalizeCompanyIdentifier,
	validateIdentifierAuthority,
	validateIdentifierEffectiveRange,
	validateIdentifierJurisdiction,
} from "../rules";
import {
	companyIdentifierSchema,
	registerCompanyIdentifierInputSchema,
} from "../schemas";
import type { CompanyIdentifierCommandDependencies } from "../store";
import type {
	CompanyIdentifier,
	RegisterCompanyIdentifierInput,
} from "../types";

type RegisterCompanyIdentifierDependencies =
	CompanyIdentifierCommandDependencies &
		Pick<
			CorporateAdministrationCommandKernelDependencies,
			"runtime" | "createEventId"
		> &
		CorporateAdministrationApprovalVerificationDependencies;

type RegisterCompanyIdentifierOptions = CorporateAdministrationCommandOptions &
	Partial<
		Pick<
			CorporateAdministrationApprovalCommandOptions,
			"approvalDecisionId" | "approvalRequestId"
		>
	>;

export async function registerCompanyIdentifier(
	input: RegisterCompanyIdentifierInput,
	options: RegisterCompanyIdentifierOptions,
	dependencies: RegisterCompanyIdentifierDependencies,
): Promise<Result<CompanyIdentifier>> {
	const nonTaxInput = assertNonTaxCompanyIdentifierType(input.identifierType);
	if (!nonTaxInput.ok) {
		return nonTaxInput;
	}

	const parsed = parseCorporateAdministrationInput(
		registerCompanyIdentifierInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const authorized = await authorizeCorporateAdministrationCommand(
		"registerCompanyIdentifier",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}

	const nonTax = assertNonTaxCompanyIdentifierType(parsed.data.identifierType);
	if (!nonTax.ok) {
		return nonTax;
	}
	const jurisdiction = validateIdentifierJurisdiction(
		parsed.data.jurisdictionCode,
	);
	if (!jurisdiction.ok) {
		return jurisdiction;
	}
	const authority = validateIdentifierAuthority(
		parsed.data.issuingAuthorityCode,
	);
	if (!authority.ok) {
		return authority;
	}
	const current = await dependencies.store.lockLegalCompany({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		expectedVersion: parsed.data.expectedCompanyVersion,
	});
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Corporate Administration legal company was not found.",
		});
	}
	if (current.data.version !== parsed.data.expectedCompanyVersion) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Corporate Administration legal company version is stale.",
		});
	}
	const country = await dependencies.referenceData.resolveCountry({
		organizationId: options.organizationId,
		countryCode: parsed.data.jurisdictionCode,
		effectiveDate: parsed.data.effectiveFrom,
	});
	if (!country.ok) {
		return country;
	}
	if (country.data === null || !country.data.active) {
		return country.data === null
			? errorResult.fail("VALIDATION_ERROR", {
					publicMessage:
						"Corporate Administration identifier jurisdiction is not active.",
				})
			: errorResult.fail("CONFLICT", {
					publicMessage:
						"Corporate Administration identifier jurisdiction is not active.",
				});
	}
	const resolvedAuthority =
		await dependencies.referenceData.resolveIdentifierAuthority({
			organizationId: options.organizationId,
			jurisdictionCode: jurisdiction.data,
			authorityCode: authority.data,
			effectiveDate: parsed.data.effectiveFrom,
		});
	if (!resolvedAuthority.ok) {
		return resolvedAuthority;
	}
	if (resolvedAuthority.data === null || !resolvedAuthority.data.active) {
		return resolvedAuthority.data === null
			? errorResult.fail("VALIDATION_ERROR", {
					publicMessage:
						"Corporate Administration identifier authority is not active.",
				})
			: errorResult.fail("CONFLICT", {
					publicMessage:
						"Corporate Administration identifier authority is not active.",
				});
	}
	const source = await dependencies.referenceData.validateSourceDocument({
		organizationId: options.organizationId,
		sourceDocumentId: parsed.data.sourceDocumentId,
	});
	if (!source.ok) {
		return source;
	}
	if (source.data === null || !source.data.active) {
		return source.data === null
			? errorResult.fail("VALIDATION_ERROR", {
					publicMessage:
						"Corporate Administration source document is not active.",
				})
			: errorResult.fail("CONFLICT", {
					publicMessage:
						"Corporate Administration source document is not active.",
				});
	}
	const sourceDocumentId = source.data.sourceDocumentId;

	const normalizedIdentifier = normalizeCompanyIdentifier({
		displayValue: parsed.data.identifierValue,
		identifierType: parsed.data.identifierType,
		authorityCode: authority.data,
	});
	const normalizedIdentifierValue = normalizedIdentifier.normalizedValue;
	const effectivePeriod = {
		from: parsed.data.effectiveFrom,
		to: parsed.data.effectiveTo ?? null,
	} as const;
	const overlap =
		await dependencies.identifierStore.findOverlappingCompanyIdentifier({
			organizationId: options.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			identifierType: parsed.data.identifierType,
			jurisdictionCode: parsed.data.jurisdictionCode,
			issuingAuthorityCode: parsed.data.issuingAuthorityCode,
			normalizedIdentifierValue,
			effectivePeriod,
		});
	if (!overlap.ok) {
		return overlap;
	}
	const effectiveRange = validateIdentifierEffectiveRange({
		candidate: effectivePeriod,
		identifierType: parsed.data.identifierType,
		jurisdictionCode: jurisdiction.data,
		authorityCode: authority.data,
		normalizedValue: normalizedIdentifierValue,
		existing: overlap.data === null ? [] : [overlap.data],
		legalCompanyId: parsed.data.legalCompanyId,
	});
	if (!effectiveRange.ok) {
		return effectiveRange;
	}

	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: registerCompanyIdentifierInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: companyIdentifierSchema,
		dependencies,
		event: {
			operationType: "UPDATE",
			targetType: "ca_company_identifier",
			aggregateId: (result) => result.legalCompanyId,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				companyIdentifierId: result.id,
				identifierType: result.identifierType,
				jurisdictionCode: result.jurisdictionCode,
				authorityCode: result.issuingAuthorityCode,
				lastFour: lastFour(result.normalizedIdentifierValue),
				effectiveFrom: result.effectiveFrom,
				effectiveTo: result.effectiveTo,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
			safeMetadata: {
				change_type: "company_identifier",
				identifier_type: parsed.data.identifierType,
				jurisdiction_code: parsed.data.jurisdictionCode,
			},
		},
		serializeResult: serializeCompanyIdentifierForReplay,
		work: (transaction, context) =>
			dependencies.identifierStore.registerCompanyIdentifier({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				identifierType: parsed.data.identifierType,
				jurisdictionCode: parsed.data.jurisdictionCode,
				issuingAuthorityCode: parsed.data.issuingAuthorityCode,
				identifierValue: parsed.data.identifierValue,
				normalizedIdentifierValue,
				effectivePeriod,
				recordedAt: context.occurredAt,
				recordedByUserId: options.actorUserId,
				sourceDocumentId,
				correctionReason: parsed.data.correctionReason,
				expectedCompanyVersion: parsed.data.expectedCompanyVersion,
				correlationId: options.correlationId,
				causationId: options.causationId,
				transaction,
			}),
	});
}

function lastFour(value: string): string {
	return value.slice(-4);
}

function serializeCompanyIdentifierForReplay(
	result: CompanyIdentifier,
): unknown {
	return {
		...result,
		recordedAt: result.recordedAt.toISOString(),
		supersededAt: result.supersededAt?.toISOString() ?? null,
		retiredAt: result.retiredAt?.toISOString() ?? null,
	};
}
