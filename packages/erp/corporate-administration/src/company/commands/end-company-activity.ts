import { errorResult, type Result } from "@afenda/errors";
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
import { toCanonicalInstant } from "../../kernel/dates";
import { parseCorporateAdministrationInput } from "../../parse-input";
import {
	type CorporateAdministrationRuntimePorts,
	commitCorporateAdministrationTransaction,
	rollbackCorporateAdministrationTransaction,
} from "../../ports";
import { endCompanyActivityInputSchema } from "../schemas";
import type { CompanyActivityCommandDependencies } from "../store";
import type { CompanyActivity, EndCompanyActivityInput } from "../types";

type EndCompanyActivityDependencies = CompanyActivityCommandDependencies &
	Readonly<{ runtime: CorporateAdministrationRuntimePorts }> &
	CorporateAdministrationApprovalVerificationDependencies;

type EndCompanyActivityOptions = CorporateAdministrationCommandOptions &
	Partial<
		Pick<
			CorporateAdministrationApprovalCommandOptions,
			"approvalDecisionId" | "approvalRequestId"
		>
	>;

export async function endCompanyActivity(
	input: EndCompanyActivityInput,
	options: EndCompanyActivityOptions,
	dependencies: EndCompanyActivityDependencies,
): Promise<Result<CompanyActivity>> {
	const parsed = parseCorporateAdministrationInput(
		endCompanyActivityInputSchema,
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
				CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS.endCompanyActivity,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	const identity = createCorporateAdministrationCommandFingerprint({
		schema: endCompanyActivityInputSchema,
		organizationId: options.organizationId,
		commandId: "corporate-administration.legal-company.end-activity",
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

	const existing = await dependencies.activityStore.getCompanyActivity({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		companyActivityId: parsed.data.companyActivityId,
	});
	if (!existing.ok) {
		return existing;
	}
	if (existing.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Corporate Administration company activity was not found.",
		});
	}
	if (existing.data.status !== "active") {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Corporate Administration company activity is already ended.",
		});
	}
	if (existing.data.version !== parsed.data.expectedActivityVersion) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Corporate Administration company activity version is stale.",
		});
	}
	if (parsed.data.endedAt < existing.data.effectiveFrom) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage:
				"Corporate Administration activity end date cannot be before the activity effective start.",
		});
	}

	const occurredAt = toCanonicalInstant(dependencies.runtime.clock.now());
	return dependencies.runtime.transaction.run<CompanyActivity>(
		async (transaction) => {
			const ended = await dependencies.activityStore.endCompanyActivity({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				companyActivityId: parsed.data.companyActivityId,
				endedAt: parsed.data.endedAt,
				endReason: parsed.data.endReason,
				expectedActivityVersion: parsed.data.expectedActivityVersion,
				recordedByUserId: options.actorUserId,
				correlationId: options.correlationId,
				causationId: options.causationId,
				transaction,
			});
			if (!ended.ok) {
				return rollbackCorporateAdministrationTransaction(ended);
			}
			const audit = await dependencies.runtime.audit.record(
				{
					organizationId: options.organizationId,
					actorUserId: options.actorUserId,
					correlationId: options.correlationId,
					causationId: options.causationId,
					operationType: "UPDATE",
					targetType: "ca_company_activity",
					targetId: ended.data.id,
					occurredAt,
					outcome: "SUCCESS",
					safeMetadata: { change_type: "company_activity_end" },
				},
				{ transaction },
			);
			if (!audit.ok) {
				return rollbackCorporateAdministrationTransaction(
					asActivityFailure(audit),
				);
			}
			return commitCorporateAdministrationTransaction(ended);
		},
	);
}

function asActivityFailure(result: Result<unknown>): Result<CompanyActivity> {
	if (result.ok) {
		throw new TypeError("Expected Corporate Administration failure Result");
	}
	return result;
}
