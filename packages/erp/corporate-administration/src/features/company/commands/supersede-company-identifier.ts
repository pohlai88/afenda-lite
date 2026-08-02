// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Identifier supersession coordinates policy, CAS, idempotency, audit, and outbox atomically.
// biome-ignore-all lint/style/useDestructuring: Explicit predecessor access keeps supersession evidence visible.
import { errorResult, type Result } from "@afenda/errors";
import type { CorporateAdministrationApprovalVerificationDependencies } from "../../../kernel/authorization/authorization";
import type {
	CorporateAdministrationApprovalCommandOptions,
	CorporateAdministrationCommandOptions,
} from "../../../kernel/execution/command-options";
import {
	authorizeCorporateAdministrationCommand,
	type CorporateAdministrationCommandKernelDependencies,
	executeCorporateAdministrationCommand,
} from "../../../kernel/internal/durable-command";
import { parseCorporateAdministrationInput } from "../../../kernel/validation/parse-input";
import {
	assertNonTaxCompanyIdentifierType,
	normalizeCompanyIdentifier,
	validateIdentifierAuthority,
	validateIdentifierEffectiveRange,
	validateIdentifierJurisdiction,
	validateIdentifierSupersession,
} from "../rules";
import {
	companyIdentifierSchema,
	supersedeCompanyIdentifierInputSchema,
} from "../schemas";
import type { CompanyIdentifierCommandDependencies } from "../store";
import type {
	CompanyIdentifier,
	SupersedeCompanyIdentifierInput,
} from "../types";

type SupersedeCompanyIdentifierDependencies =
	CompanyIdentifierCommandDependencies &
		Pick<
			CorporateAdministrationCommandKernelDependencies,
			"runtime" | "createEventId"
		> &
		CorporateAdministrationApprovalVerificationDependencies;

type SupersedeCompanyIdentifierOptions = CorporateAdministrationCommandOptions &
	Partial<
		Pick<
			CorporateAdministrationApprovalCommandOptions,
			"approvalDecisionId" | "approvalRequestId"
		>
	>;

export async function supersedeCompanyIdentifier(
	input: SupersedeCompanyIdentifierInput,
	options: SupersedeCompanyIdentifierOptions,
	dependencies: SupersedeCompanyIdentifierDependencies,
): Promise<Result<CompanyIdentifier>> {
	const nonTaxInput = assertNonTaxCompanyIdentifierType(
		input.replacement.identifierType,
	);
	if (!nonTaxInput.ok) {
		return nonTaxInput;
	}

	const parsed = parseCorporateAdministrationInput(
		supersedeCompanyIdentifierInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const authorized = await authorizeCorporateAdministrationCommand(
		"supersedeCompanyIdentifier",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}

	const nonTax = assertNonTaxCompanyIdentifierType(
		parsed.data.replacement.identifierType,
	);
	if (!nonTax.ok) {
		return nonTax;
	}
	const predecessor = await dependencies.identifierStore.getCompanyIdentifier({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		companyIdentifierId: parsed.data.companyIdentifierId,
	});
	if (!predecessor.ok) {
		return predecessor;
	}
	const supersession = validateIdentifierSupersession({
		identifier: predecessor.data,
		expectedVersion: parsed.data.expectedIdentifierVersion,
	});
	if (!supersession.ok) {
		return supersession;
	}
	const jurisdiction = validateIdentifierJurisdiction(
		parsed.data.replacement.jurisdictionCode,
	);
	if (!jurisdiction.ok) {
		return jurisdiction;
	}
	const authority = validateIdentifierAuthority(
		parsed.data.replacement.issuingAuthorityCode,
	);
	if (!authority.ok) {
		return authority;
	}
	const country = await dependencies.referenceData.resolveCountry({
		organizationId: options.organizationId,
		countryCode: parsed.data.replacement.jurisdictionCode,
		effectiveDate: parsed.data.replacement.effectiveFrom,
	});
	if (!country.ok) {
		return country;
	}
	if (country.data === null || !country.data.active) {
		return inactiveReference("jurisdictionCode", country.data === null);
	}
	const resolvedAuthority =
		await dependencies.referenceData.resolveIdentifierAuthority({
			organizationId: options.organizationId,
			jurisdictionCode: jurisdiction.data,
			authorityCode: authority.data,
			effectiveDate: parsed.data.replacement.effectiveFrom,
		});
	if (!resolvedAuthority.ok) {
		return resolvedAuthority;
	}
	if (resolvedAuthority.data === null || !resolvedAuthority.data.active) {
		return inactiveReference("authorityCode", resolvedAuthority.data === null);
	}
	const source = await dependencies.referenceData.validateSourceDocument({
		organizationId: options.organizationId,
		sourceDocumentId: parsed.data.replacement.sourceDocumentId,
	});
	if (!source.ok) {
		return source;
	}
	if (source.data === null || !source.data.active) {
		return inactiveReference("sourceDocumentId", source.data === null);
	}
	const sourceDocumentId = source.data.sourceDocumentId;

	const normalizedIdentifier = normalizeCompanyIdentifier({
		displayValue: parsed.data.replacement.identifierValue,
		identifierType: parsed.data.replacement.identifierType,
		authorityCode: authority.data,
	});
	const normalizedIdentifierValue = normalizedIdentifier.normalizedValue;
	const effectivePeriod = {
		from: parsed.data.replacement.effectiveFrom,
		to: parsed.data.replacement.effectiveTo ?? null,
	} as const;
	const overlap =
		await dependencies.identifierStore.findOverlappingCompanyIdentifier({
			organizationId: options.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			identifierType: parsed.data.replacement.identifierType,
			jurisdictionCode: parsed.data.replacement.jurisdictionCode,
			issuingAuthorityCode: parsed.data.replacement.issuingAuthorityCode,
			normalizedIdentifierValue,
			effectivePeriod,
			ignoreCompanyIdentifierId: parsed.data.companyIdentifierId,
		});
	if (!overlap.ok) {
		return overlap;
	}
	const effectiveRange = validateIdentifierEffectiveRange({
		candidate: effectivePeriod,
		identifierType: parsed.data.replacement.identifierType,
		jurisdictionCode: jurisdiction.data,
		authorityCode: authority.data,
		normalizedValue: normalizedIdentifierValue,
		existing: overlap.data === null ? [] : [overlap.data],
		ignoreCompanyIdentifierId: parsed.data.companyIdentifierId,
		legalCompanyId: parsed.data.legalCompanyId,
	});
	if (!effectiveRange.ok) {
		return effectiveRange;
	}

	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: supersedeCompanyIdentifierInputSchema,
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
				change_type: "company_identifier_supersession",
				identifier_type: parsed.data.replacement.identifierType,
			},
		},
		serializeResult: serializeIdentifierForReplay,
		work: (transaction, context) =>
			dependencies.identifierStore.supersedeCompanyIdentifier({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				companyIdentifierId: parsed.data.companyIdentifierId,
				replacement: {
					identifierType: parsed.data.replacement.identifierType,
					jurisdictionCode: parsed.data.replacement.jurisdictionCode,
					issuingAuthorityCode: parsed.data.replacement.issuingAuthorityCode,
					identifierValue: parsed.data.replacement.identifierValue,
					normalizedIdentifierValue,
					effectivePeriod,
					recordedAt: context.occurredAt,
					sourceDocumentId,
					correctionReason: parsed.data.replacement.correctionReason,
				},
				expectedIdentifierVersion: parsed.data.expectedIdentifierVersion,
				recordedByUserId: options.actorUserId,
				correlationId: options.correlationId,
				causationId: options.causationId,
				transaction,
			}),
	});
}

function lastFour(value: string): string {
	return value.slice(-4);
}

function serializeIdentifierForReplay(result: CompanyIdentifier): unknown {
	return {
		...result,
		recordedAt: result.recordedAt.toISOString(),
		supersededAt: result.supersededAt?.toISOString() ?? null,
		retiredAt: result.retiredAt?.toISOString() ?? null,
	};
}

function inactiveReference(_field: string, missing: boolean): Result<never> {
	return missing
		? errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Corporate Administration reference is not active.",
			})
		: errorResult.fail("CONFLICT", {
				publicMessage: "Corporate Administration reference is not active.",
			});
}
