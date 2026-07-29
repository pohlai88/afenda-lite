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
	normalizeCompanyName,
	validateCompanyNameSupersession,
} from "../rules";
import { companyNameSchema, supersedeCompanyNameInputSchema } from "../schemas";
import type { CompanyNameCommandDependencies } from "../store";
import type { CompanyName, SupersedeCompanyNameInput } from "../types";
import {
	type DurableLegalCompanyCommandDependencies,
	runDurableCompanyCommand,
} from "./durable-command";

type SupersedeCompanyNameDependencies = CompanyNameCommandDependencies &
	Pick<DurableLegalCompanyCommandDependencies, "runtime" | "createEventId"> &
	CorporateAdministrationApprovalVerificationDependencies;

type SupersedeCompanyNameOptions = CorporateAdministrationCommandOptions &
	Partial<
		Pick<
			CorporateAdministrationApprovalCommandOptions,
			"approvalDecisionId" | "approvalRequestId"
		>
	>;

export async function supersedeCompanyName(
	input: SupersedeCompanyNameInput,
	options: SupersedeCompanyNameOptions,
	dependencies: SupersedeCompanyNameDependencies,
): Promise<Result<CompanyName>> {
	const parsed = parseCorporateAdministrationInput(
		supersedeCompanyNameInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;

	const authorized = await requireCorporateAdministrationPermission(
		options.authorization,
		{
			organizationId: options.organizationId,
			actorUserId: options.actorUserId,
			permission:
				CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS.supersedeCompanyName,
		},
	);
	if (!authorized.ok) return authorized;

	const identity = createCorporateAdministrationCommandFingerprint({
		schema: supersedeCompanyNameInputSchema,
		organizationId: options.organizationId,
		commandId: "corporate-administration.legal-company.supersede-company-name",
		input: parsed.data,
	});
	if (!identity.ok) return identity;
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
	if (!approved.ok) return approved;

	const sourceDocument =
		await dependencies.referenceData.validateSourceDocument({
			organizationId: options.organizationId,
			sourceDocumentId: parsed.data.replacement.sourceDocumentId,
		});
	if (!sourceDocument.ok) return sourceDocument;
	if (sourceDocument.data === null) {
		return fail(
			"NOT_FOUND",
			"Corporate Administration source document was not found.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
				{ field: "sourceDocumentId" },
			),
		);
	}
	if (!sourceDocument.data.active) {
		return fail(
			"CONFLICT",
			"Corporate Administration source document is inactive.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INACTIVE",
				{ field: "sourceDocumentId" },
			),
		);
	}
	const sourceDocumentId = sourceDocument.data.sourceDocumentId;

	const existing = await dependencies.nameStore.getCompanyName({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		companyNameId: parsed.data.companyNameId,
	});
	if (!existing.ok) return existing;
	const eligible = validateCompanyNameSupersession({
		name: existing.data,
		expectedVersion: parsed.data.expectedNameVersion,
	});
	if (!eligible.ok) return eligible;

	const normalizedName = normalizeCompanyName(
		parsed.data.replacement.displayName,
	);
	const effectivePeriod = {
		from: parsed.data.replacement.effectiveFrom,
		to: parsed.data.replacement.effectiveTo ?? null,
	} as const;
	const overlap = await dependencies.nameStore.findOverlappingCompanyName({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		nameType: parsed.data.replacement.nameType,
		languageCode: parsed.data.replacement.languageCode,
		normalizedName,
		effectivePeriod,
		ignoreCompanyNameId: parsed.data.companyNameId,
	});
	if (!overlap.ok) return overlap;
	if (overlap.data !== null) {
		return fail(
			"CONFLICT",
			"Corporate Administration company name overlaps an existing name for the same type and language.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
				{ field: "effectivePeriod" },
			),
		);
	}

	return runDurableCompanyCommand({
		commandId: "corporate-administration.legal-company.supersede-company-name",
		fingerprintSchema: supersedeCompanyNameInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: companyNameSchema,
		options,
		dependencies,
		event: {
			type: "corporate_administration.legal_company.name_superseded.v1",
			operationType: "UPDATE",
			targetType: "ca_company_name",
			aggregateId: (result) => result.legalCompanyId,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				predecessorCompanyNameId: parsed.data.companyNameId,
				successorCompanyNameId: result.id,
				nameType: result.nameType,
				languageCode: result.languageCode,
				effectiveFrom: result.effectiveFrom,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
			safeMetadata: {
				change_type: "company_name_supersession",
				name_type: parsed.data.replacement.nameType,
				language_code: parsed.data.replacement.languageCode,
			},
		},
		serializeResult: serializeCompanyNameForReplay,
		work: (transaction, context) =>
			dependencies.nameStore.supersedeCompanyName({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				companyNameId: parsed.data.companyNameId,
				replacement: {
					nameType: parsed.data.replacement.nameType,
					languageCode: parsed.data.replacement.languageCode,
					displayName: parsed.data.replacement.displayName,
					normalizedName,
					effectivePeriod,
					recordedAt: context.occurredAt,
					sourceDocumentId,
					correctionReason: parsed.data.replacement.correctionReason,
				},
				expectedNameVersion: parsed.data.expectedNameVersion,
				recordedByUserId: options.actorUserId,
				correlationId: options.correlationId,
				causationId: options.causationId,
				transaction,
			}),
	});
}

function serializeCompanyNameForReplay(result: CompanyName): unknown {
	return {
		...result,
		recordedAt: result.recordedAt.toISOString(),
		supersededAt: result.supersededAt?.toISOString() ?? null,
		retiredAt: result.retiredAt?.toISOString() ?? null,
	};
}
