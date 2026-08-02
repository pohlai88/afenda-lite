// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Legal-form mutation coordinates policy, CAS, idempotency, audit, and outbox atomically.
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
	companyLegalFormSchema,
	setCompanyLegalFormInputSchema,
} from "../schemas";
import type { CompanyLegalFormCommandDependencies } from "../store";
import type { CompanyLegalForm, SetCompanyLegalFormInput } from "../types";

type SetCompanyLegalFormDependencies = CompanyLegalFormCommandDependencies &
	Pick<
		CorporateAdministrationCommandKernelDependencies,
		"runtime" | "createEventId"
	> &
	CorporateAdministrationApprovalVerificationDependencies;

type SetCompanyLegalFormOptions = CorporateAdministrationCommandOptions &
	Partial<
		Pick<
			CorporateAdministrationApprovalCommandOptions,
			"approvalDecisionId" | "approvalRequestId"
		>
	>;

export async function setCompanyLegalForm(
	input: SetCompanyLegalFormInput,
	options: SetCompanyLegalFormOptions,
	dependencies: SetCompanyLegalFormDependencies,
): Promise<Result<CompanyLegalForm>> {
	const parsed = parseCorporateAdministrationInput(
		setCompanyLegalFormInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const authorized = await authorizeCorporateAdministrationCommand(
		"setCompanyLegalForm",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}

	const sourceDocument =
		await dependencies.referenceData.validateSourceDocument({
			organizationId: options.organizationId,
			sourceDocumentId: parsed.data.sourceDocumentId,
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

	const jurisdictionProfile = current.data.currentJurisdictionProfile;
	if (
		jurisdictionProfile === null ||
		jurisdictionProfile.jurisdictionCountryCode !== parsed.data.jurisdictionCode
	) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage:
				"Corporate Administration jurisdiction profile is required for the legal form jurisdiction.",
		});
	}
	const legalForm = await dependencies.referenceData.resolveLegalForm({
		organizationId: options.organizationId,
		jurisdictionCode: parsed.data.jurisdictionCode,
		legalFormCode: parsed.data.legalFormCode,
		effectiveDate: parsed.data.effectiveFrom,
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
			jurisdictionCode: parsed.data.jurisdictionCode,
			entityTypeCode: parsed.data.entityTypeCode,
			legalFormCode: parsed.data.legalFormCode,
			effectiveDate: parsed.data.effectiveFrom,
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

	const effectivePeriod = {
		from: parsed.data.effectiveFrom,
		to: parsed.data.effectiveTo ?? null,
	} as const;
	const overlap =
		await dependencies.legalFormStore.findOverlappingCompanyLegalForm({
			organizationId: options.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			effectivePeriod,
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

	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: setCompanyLegalFormInputSchema,
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
				previousLegalFormCode: null,
				jurisdictionCode: result.jurisdictionCode,
				legalFormCode: result.legalFormCode,
				effectiveFrom: result.effectiveFrom,
				effectiveTo: result.effectiveTo,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
			safeMetadata: {
				change_type: "legal_form",
				jurisdiction_code: parsed.data.jurisdictionCode,
			},
		},
		serializeResult: serializeLegalFormForReplay,
		work: (transaction, context) =>
			dependencies.legalFormStore.setCompanyLegalForm({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				legalFormCode: parsed.data.legalFormCode,
				jurisdictionCode: parsed.data.jurisdictionCode,
				entityTypeCode: parsed.data.entityTypeCode,
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

function serializeLegalFormForReplay(result: CompanyLegalForm): unknown {
	return {
		...result,
		recordedAt: result.recordedAt.toISOString(),
		supersededAt: result.supersededAt?.toISOString() ?? null,
	};
}
