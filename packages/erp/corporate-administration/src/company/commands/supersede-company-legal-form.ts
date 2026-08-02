// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Legal-form supersession coordinates policy, CAS, idempotency, audit, and outbox atomically.
// biome-ignore-all lint/style/useDestructuring: Explicit predecessor access keeps supersession evidence visible.
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

type SupersedeCompanyLegalFormDependencies =
	CompanyLegalFormCommandDependencies &
		Pick<
			CorporateAdministrationCommandKernelDependencies,
			"runtime" | "createEventId"
		> &
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
	if (!parsed.ok) {
		return parsed;
	}

	const authorized = await authorizeCorporateAdministrationCommand(
		"supersedeCompanyLegalForm",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}

	const sourceDocument =
		await dependencies.referenceData.validateSourceDocument({
			organizationId: options.organizationId,
			sourceDocumentId: parsed.data.replacement.sourceDocumentId,
		});
	if (!sourceDocument.ok) {
		return sourceDocument;
	}
	if (sourceDocument.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Corporate Administration source document was not found.",
		});
	}
	if (!sourceDocument.data.active) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Corporate Administration source document is inactive.",
		});
	}
	const sourceDocumentId = sourceDocument.data.sourceDocumentId;

	const existing = await dependencies.legalFormStore.getCompanyLegalForm({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		companyLegalFormHistoryId: parsed.data.companyLegalFormHistoryId,
	});
	if (!existing.ok) {
		return existing;
	}
	const eligible = validateLegalFormSupersession({
		legalForm: existing.data,
		expectedVersion: parsed.data.expectedLegalFormVersion,
	});
	if (!eligible.ok) {
		return eligible;
	}

	const company = await dependencies.store.getLegalCompany({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
	});
	if (!company.ok) {
		return company;
	}
	const jurisdictionProfile = company.data?.currentJurisdictionProfile ?? null;
	if (
		jurisdictionProfile === null ||
		jurisdictionProfile.jurisdictionCountryCode !==
			parsed.data.replacement.jurisdictionCode
	) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage:
				"Corporate Administration jurisdiction profile is required for the legal form jurisdiction.",
		});
	}
	const legalForm = await dependencies.referenceData.resolveLegalForm({
		organizationId: options.organizationId,
		jurisdictionCode: parsed.data.replacement.jurisdictionCode,
		legalFormCode: parsed.data.replacement.legalFormCode,
		effectiveDate: parsed.data.replacement.effectiveFrom,
	});
	if (!legalForm.ok) {
		return legalForm;
	}
	if (legalForm.data === null) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Corporate Administration legal form is not configured.",
		});
	}
	if (!legalForm.data.active) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Corporate Administration legal form is inactive.",
		});
	}

	const compatible =
		await dependencies.referenceData.validateLegalFormCompatibility({
			organizationId: options.organizationId,
			jurisdictionCode: parsed.data.replacement.jurisdictionCode,
			entityTypeCode: parsed.data.replacement.entityTypeCode,
			legalFormCode: parsed.data.replacement.legalFormCode,
			effectiveDate: parsed.data.replacement.effectiveFrom,
		});
	if (!compatible.ok) {
		return compatible;
	}
	if (!compatible.data.active) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Corporate Administration legal-form compatibility rule is inactive.",
		});
	}
	if (!compatible.data.compatible) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Corporate Administration legal form is not compatible with the entity type.",
		});
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
	if (!overlap.ok) {
		return overlap;
	}
	if (overlap.data !== null) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Corporate Administration legal form overlaps an existing legal form.",
		});
	}
	const effectivePeriod = {
		from: parsed.data.replacement.effectiveFrom,
		to: parsed.data.replacement.effectiveTo ?? null,
	} as const;

	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: supersedeCompanyLegalFormInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: companyLegalFormSchema,
		dependencies,
		event: {
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
