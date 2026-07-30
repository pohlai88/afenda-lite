// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Identifier supersession coordinates policy, CAS, idempotency, audit, and outbox atomically.
// biome-ignore-all lint/style/useDestructuring: Explicit predecessor access keeps supersession evidence visible.
import { fail, type Result } from "@afenda/errors/result";
import {
	CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
	type CorporateAdministrationApprovalVerificationDependencies,
	requireCorporateAdministrationApprovalIfConfigured,
	requireCorporateAdministrationPermission,
} from "../../authorization";
import { createCorporateAdministrationCommandFingerprint } from "../../command-identity";
import type {
	CorporateAdministrationApprovalCommandOptions,
	CorporateAdministrationCommandOptions,
} from "../../command-options";
import { corporateAdministrationErrorDetails } from "../../error-codes";
import { parseCorporateAdministrationInput } from "../../parse-input";
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
import {
	type DurableLegalCompanyCommandDependencies,
	runDurableCompanyCommand,
} from "./durable-command";

type SupersedeCompanyIdentifierDependencies =
	CompanyIdentifierCommandDependencies &
		Pick<DurableLegalCompanyCommandDependencies, "runtime" | "createEventId"> &
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

	const authorized = await requireCorporateAdministrationPermission(
		options.authorization,
		{
			organizationId: options.organizationId,
			actorUserId: options.actorUserId,
			permission:
				CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS.supersedeCompanyIdentifier,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	const identity = createCorporateAdministrationCommandFingerprint({
		schema: supersedeCompanyIdentifierInputSchema,
		organizationId: options.organizationId,
		commandId: "corporate-administration.legal-company.supersede-identifier",
		input: parsed.data,
	});
	if (!identity.ok) {
		return identity;
	}
	const approved = await requireCorporateAdministrationApprovalIfConfigured(
		dependencies,
		{
			organizationId: options.organizationId,
			actorUserId: options.actorUserId,
			approvalRequestId: options.approvalRequestId,
			approvalDecisionId: options.approvalDecisionId,
			commandFingerprint: identity.data.fingerprint,
		},
	);
	if (!approved.ok) {
		return approved;
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

	return runDurableCompanyCommand({
		commandId: "corporate-administration.legal-company.supersede-identifier",
		fingerprintSchema: supersedeCompanyIdentifierInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: companyIdentifierSchema,
		options,
		dependencies,
		event: {
			type: "corporate_administration.legal_company.identifier_registered.v1",
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

function inactiveReference(field: string, missing: boolean): Result<never> {
	return fail(
		missing ? "VALIDATION_ERROR" : "CONFLICT",
		"Corporate Administration reference is not active.",
		corporateAdministrationErrorDetails(
			missing
				? "CORPORATE_ADMINISTRATION_REFERENCE_INVALID"
				: "CORPORATE_ADMINISTRATION_REFERENCE_INACTIVE",
			{ field },
		),
	);
}
