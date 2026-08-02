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
	companyActivitySchema,
	endCompanyActivityInputSchema,
} from "../schemas";
import type { CompanyActivityCommandDependencies } from "../store";
import type { CompanyActivity, EndCompanyActivityInput } from "../types";

type EndCompanyActivityDependencies = CompanyActivityCommandDependencies &
	Pick<
		CorporateAdministrationCommandKernelDependencies,
		"runtime" | "createEventId"
	> &
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

	const authorized = await authorizeCorporateAdministrationCommand(
		"endCompanyActivity",
		options,
	);
	if (!authorized.ok) {
		return authorized;
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

	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: endCompanyActivityInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: companyActivitySchema,
		dependencies,
		event: {
			operationType: "UPDATE",
			targetType: "ca_company_activity",
			aggregateId: (result) => result.legalCompanyId,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				companyActivityId: result.id,
				activityType: result.classification,
				activityCode: result.activityCode,
				jurisdictionCode: result.jurisdictionCode,
				endedAt: result.effectiveTo ?? parsed.data.endedAt,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
			safeMetadata: {
				change_type: "company_activity_end",
				classification: existing.data.classification,
			},
		},
		serializeResult: serializeActivityForReplay,
		work: (transaction) =>
			dependencies.activityStore.endCompanyActivity({
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
			}),
	});
}

function serializeActivityForReplay(result: CompanyActivity): unknown {
	return {
		...result,
		recordedAt: result.recordedAt.toISOString(),
	};
}
