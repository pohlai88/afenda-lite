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
import { validateLegalFormSupersession } from "../rules";
import {
	companyLegalFormSchema,
	supersedeCompanyLegalFormInputSchema,
} from "../schemas";
import type { CompanyLegalFormCommandDependencies } from "../store";
import type {
	CompanyLegalForm,
	SupersedeCompanyLegalFormInput,
} from "../types";
import {
	type DurableLegalCompanyCommandDependencies,
	runDurableCompanyCommand,
} from "./durable-command";

type SupersedeCompanyLegalFormDependencies =
	CompanyLegalFormCommandDependencies &
		Pick<DurableLegalCompanyCommandDependencies, "runtime" | "createEventId"> &
		CorporateAdministrationApprovalVerificationDependencies;

type SupersedeCompanyLegalFormOptions = CorporateAdministrationCommandOptions &
	Partial<
		Pick<
			CorporateAdministrationApprovalCommandOptions,
			"approvalDecisionId" | "approvalRequestId"
		>
	>;

export async function supersedeCompanyLegalForm(
	input: SupersedeCompanyLegalFormInput,
	options: SupersedeCompanyLegalFormOptions,
	dependencies: SupersedeCompanyLegalFormDependencies,
): Promise<Result<CompanyLegalForm>> {
	const parsed = parseCorporateAdministrationInput(
		supersedeCompanyLegalFormInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;

	const authorized = await requireCorporateAdministrationPermission(
		options.authorization,
		{
			organizationId: options.organizationId,
			actorUserId: options.actorUserId,
			permission:
				CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS.supersedeCompanyLegalForm,
		},
	);
	if (!authorized.ok) return authorized;

	const identity = createCorporateAdministrationCommandFingerprint({
		schema: supersedeCompanyLegalFormInputSchema,
		organizationId: options.organizationId,
		commandId:
			"corporate-administration.legal-company.supersede-company-legal-form",
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
			"VALIDATION_ERROR",
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

	const existing = await dependencies.legalFormStore.getCompanyLegalForm({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		companyLegalFormHistoryId: parsed.data.companyLegalFormHistoryId,
	});
	if (!existing.ok) return existing;
	const eligible = validateLegalFormSupersession({
		legalForm: existing.data,
		expectedVersion: parsed.data.expectedLegalFormVersion,
	});
	if (!eligible.ok) return eligible;

	const jurisdictionProfile =
		await dependencies.store.findJurisdictionProfileAsOf({
			organizationId: options.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			asOf: parsed.data.replacement.effectiveFrom,
		});
	if (!jurisdictionProfile.ok) return jurisdictionProfile;
	if (jurisdictionProfile.data === null) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration jurisdiction profile is required for the legal form effective date.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
				{ field: "jurisdictionCode" },
			),
		);
	}
	const legalForm = await dependencies.referenceData.resolveLegalForm({
		organizationId: options.organizationId,
		jurisdictionCode: parsed.data.replacement.jurisdictionCode,
		legalFormCode: parsed.data.replacement.legalFormCode,
		effectiveDate: parsed.data.replacement.effectiveFrom,
	});
	if (!legalForm.ok) return legalForm;
	if (legalForm.data === null) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration legal form is not configured.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
				{ field: "legalFormCode" },
			),
		);
	}
	if (!legalForm.data.active) {
		return fail(
			"CONFLICT",
			"Corporate Administration legal form is inactive.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INACTIVE",
				{ field: "legalFormCode" },
			),
		);
	}

	const compatible =
		await dependencies.referenceData.validateLegalFormCompatibility({
			organizationId: options.organizationId,
			jurisdictionCode: parsed.data.replacement.jurisdictionCode,
			entityTypeCode: parsed.data.replacement.entityTypeCode,
			legalFormCode: parsed.data.replacement.legalFormCode,
			effectiveDate: parsed.data.replacement.effectiveFrom,
		});
	if (!compatible.ok) return compatible;
	if (!compatible.data.active) {
		return fail(
			"CONFLICT",
			"Corporate Administration legal-form compatibility rule is inactive.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INACTIVE",
				{ field: "legalFormCode" },
			),
		);
	}
	if (!compatible.data.compatible) {
		return fail(
			"CONFLICT",
			"Corporate Administration legal form is not compatible with the entity type.",
			corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_CONFLICT", {
				field: "legalFormCode",
			}),
		);
	}

	const overlap =
		await dependencies.legalFormStore.findOverlappingCompanyLegalForm({
			organizationId: options.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			effectivePeriod: {
				from: parsed.data.replacement.effectiveFrom,
				to: parsed.data.replacement.effectiveTo ?? null,
			},
			ignoreCompanyLegalFormId: parsed.data.companyLegalFormHistoryId,
		});
	if (!overlap.ok) return overlap;
	if (overlap.data !== null) {
		return fail(
			"CONFLICT",
			"Corporate Administration legal form overlaps an existing legal form.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
				{ field: "effectivePeriod" },
			),
		);
	}
	const effectivePeriod = {
		from: parsed.data.replacement.effectiveFrom,
		to: parsed.data.replacement.effectiveTo ?? null,
	} as const;

	return runDurableCompanyCommand({
		commandId:
			"corporate-administration.legal-company.supersede-company-legal-form",
		fingerprintSchema: supersedeCompanyLegalFormInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: companyLegalFormSchema,
		options,
		dependencies,
		event: {
			type: "corporate_administration.legal_company.legal_form_changed.v1",
			operationType: "UPDATE",
			targetType: "ca_company_legal_form_history",
			aggregateId: (result) => result.legalCompanyId,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				legalFormHistoryId: result.id,
				previousLegalFormCode: eligible.data.legalFormCode,
				jurisdictionCode: result.jurisdictionCode,
				legalFormCode: result.legalFormCode,
				effectiveFrom: result.effectiveFrom,
				effectiveTo: result.effectiveTo,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
			safeMetadata: {
				change_type: "legal_form_supersession",
				jurisdiction_code: parsed.data.replacement.jurisdictionCode,
			},
		},
		serializeResult: serializeLegalFormForReplay,
		work: (transaction, context) =>
			dependencies.legalFormStore.supersedeCompanyLegalForm({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				companyLegalFormHistoryId: parsed.data.companyLegalFormHistoryId,
				replacement: {
					legalFormCode: parsed.data.replacement.legalFormCode,
					jurisdictionCode: parsed.data.replacement.jurisdictionCode,
					entityTypeCode: parsed.data.replacement.entityTypeCode,
					effectivePeriod,
					recordedAt: context.occurredAt,
					sourceDocumentId,
					correctionReason: parsed.data.replacement.correctionReason,
				},
				expectedLegalFormVersion: parsed.data.expectedLegalFormVersion,
				recordedByUserId: options.actorUserId,
				correlationId: options.correlationId,
				causationId: options.causationId,
				transaction,
			}),
	});
}

function serializeLegalFormForReplay(result: CompanyLegalForm): unknown {
	return {
		...result,
		recordedAt: result.recordedAt.toISOString(),
		supersededAt: result.supersededAt?.toISOString() ?? null,
	};
}
