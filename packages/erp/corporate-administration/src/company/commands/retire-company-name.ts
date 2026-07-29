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
import { toCanonicalInstant } from "../../kernel/dates";
import { parseCorporateAdministrationInput } from "../../parse-input";
import {
	type CorporateAdministrationRuntimePorts,
	commitCorporateAdministrationTransaction,
	rollbackCorporateAdministrationTransaction,
} from "../../ports";
import { validateCompanyNameSupersession } from "../rules";
import { retireCompanyNameInputSchema } from "../schemas";
import type { CompanyNameCommandDependencies } from "../store";
import type { CompanyName, RetireCompanyNameInput } from "../types";

type RetireCompanyNameDependencies = CompanyNameCommandDependencies &
	Readonly<{ runtime: CorporateAdministrationRuntimePorts }> &
	CorporateAdministrationApprovalVerificationDependencies;

type RetireCompanyNameOptions = CorporateAdministrationCommandOptions &
	Partial<
		Pick<
			CorporateAdministrationApprovalCommandOptions,
			"approvalDecisionId" | "approvalRequestId"
		>
	>;

export async function retireCompanyName(
	input: RetireCompanyNameInput,
	options: RetireCompanyNameOptions,
	dependencies: RetireCompanyNameDependencies,
): Promise<Result<CompanyName>> {
	const parsed = parseCorporateAdministrationInput(
		retireCompanyNameInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;

	const authorized = await requireCorporateAdministrationPermission(
		options.authorization,
		{
			organizationId: options.organizationId,
			actorUserId: options.actorUserId,
			permission:
				CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS.retireCompanyName,
		},
	);
	if (!authorized.ok) return authorized;

	const identity = createCorporateAdministrationCommandFingerprint({
		schema: retireCompanyNameInputSchema,
		organizationId: options.organizationId,
		commandId: "corporate-administration.legal-company.retire-company-name",
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
		parsed.data.sourceDocumentId === undefined ||
		parsed.data.sourceDocumentId === null
			? null
			: await dependencies.referenceData.validateSourceDocument({
					organizationId: options.organizationId,
					sourceDocumentId: parsed.data.sourceDocumentId,
				});
	if (sourceDocument !== null) {
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
	}

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
	if (
		eligible.data.nameType !== "trading" &&
		eligible.data.nameType !== "translated"
	) {
		return fail(
			"CONFLICT",
			"Corporate Administration only trading or translated company names can be retired directly.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_INVALID_TRANSITION",
				{ field: "nameType" },
			),
		);
	}

	const occurredAt = toCanonicalInstant(dependencies.runtime.clock.now());
	return dependencies.runtime.transaction.run<CompanyName>(
		async (transaction) => {
			const retired = await dependencies.nameStore.retireCompanyName({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				companyNameId: parsed.data.companyNameId,
				retiredAt: parsed.data.retiredAt,
				retirementReason: parsed.data.retirementReason,
				expectedNameVersion: parsed.data.expectedNameVersion,
				recordedByUserId: options.actorUserId,
				correlationId: options.correlationId,
				causationId: options.causationId,
				transaction,
			});
			if (!retired.ok) {
				return rollbackCorporateAdministrationTransaction(retired);
			}
			const audit = await dependencies.runtime.audit.record(
				{
					organizationId: options.organizationId,
					actorUserId: options.actorUserId,
					correlationId: options.correlationId,
					causationId: options.causationId,
					operationType: "UPDATE",
					targetType: "ca_company_name",
					targetId: retired.data.id,
					occurredAt,
					outcome: "SUCCESS",
					safeMetadata: {
						change_type: "company_name_retirement",
						name_type: retired.data.nameType,
					},
				},
				{ transaction },
			);
			if (!audit.ok) {
				return rollbackCorporateAdministrationTransaction(
					asCompanyNameFailure(audit),
				);
			}
			return commitCorporateAdministrationTransaction(retired);
		},
	);
}

function asCompanyNameFailure(result: Result<unknown>): Result<CompanyName> {
	if (result.ok) {
		throw new TypeError("Expected Corporate Administration failure Result");
	}
	return fail(result.code, result.message, result.details);
}
