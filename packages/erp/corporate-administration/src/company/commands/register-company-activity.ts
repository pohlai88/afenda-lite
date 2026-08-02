// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Activity registration coordinates policy, idempotency, audit, and outbox atomically.
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
	validateActivityAuthority,
	validateActivityEffectiveRange,
} from "../rules";
import {
	companyActivitySchema,
	registerCompanyActivityInputSchema,
} from "../schemas";
import type { CompanyActivityCommandDependencies } from "../store";
import type { CompanyActivity, RegisterCompanyActivityInput } from "../types";

type RegisterCompanyActivityDependencies = CompanyActivityCommandDependencies &
	Pick<
		CorporateAdministrationCommandKernelDependencies,
		"runtime" | "createEventId"
	> &
	CorporateAdministrationApprovalVerificationDependencies;

type RegisterCompanyActivityOptions = CorporateAdministrationCommandOptions &
	Partial<
		Pick<
			CorporateAdministrationApprovalCommandOptions,
			"approvalDecisionId" | "approvalRequestId"
		>
	>;

export async function registerCompanyActivity(
	input: RegisterCompanyActivityInput,
	options: RegisterCompanyActivityOptions,
	dependencies: RegisterCompanyActivityDependencies,
): Promise<Result<CompanyActivity>> {
	const parsed = parseCorporateAdministrationInput(
		registerCompanyActivityInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const authorized = await authorizeCorporateAdministrationCommand(
		"registerCompanyActivity",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}

	const activityAuthority = validateActivityAuthority({
		activityType: parsed.data.classification,
		classificationSystem: "reference_data",
		activityCode: parsed.data.activityCode,
		jurisdictionCode: parsed.data.jurisdictionCode,
		regulatorCode: parsed.data.regulatorCode ?? null,
	});
	if (!activityAuthority.ok) {
		return activityAuthority;
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
		return legalCompanyNotFound();
	}
	if (current.data.version !== parsed.data.expectedCompanyVersion) {
		return staleCompanyVersion(
			parsed.data.expectedCompanyVersion,
			current.data.version,
		);
	}

	const activity =
		await dependencies.referenceData.resolveActivityClassification({
			organizationId: options.organizationId,
			classificationSystem: "registered_activity",
			activityCode: parsed.data.activityCode,
			effectiveDate: parsed.data.effectiveFrom,
		});
	if (!activity.ok) {
		return activity;
	}
	if (activity.data === null || !activity.data.active) {
		return inactiveReference("activityCode", activity.data === null);
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
		return inactiveReference("jurisdictionCode", country.data === null);
	}
	if (
		parsed.data.regulatorCode !== undefined &&
		parsed.data.regulatorCode !== null
	) {
		const regulator = await dependencies.referenceData.resolveRegulator({
			organizationId: options.organizationId,
			jurisdictionCode: parsed.data.jurisdictionCode,
			regulatorCode: parsed.data.regulatorCode,
			effectiveDate: parsed.data.effectiveFrom,
		});
		if (!regulator.ok) {
			return regulator;
		}
		if (regulator.data === null || !regulator.data.active) {
			return inactiveReference("regulatorCode", regulator.data === null);
		}
	}
	const source = await dependencies.referenceData.validateSourceDocument({
		organizationId: options.organizationId,
		sourceDocumentId: parsed.data.sourceDocumentId,
	});
	if (!source.ok) {
		return source;
	}
	if (source.data === null || !source.data.active) {
		return inactiveReference("sourceDocumentId", source.data === null);
	}
	const sourceDocumentId = source.data.sourceDocumentId;
	const effectivePeriod = {
		from: parsed.data.effectiveFrom,
		to: parsed.data.effectiveTo ?? null,
	} as const;
	const existingActivities =
		await dependencies.activityStore.listCompanyActivitiesAsOf({
			organizationId: options.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			asOf: parsed.data.effectiveFrom,
			classification: parsed.data.classification,
			jurisdictionCode: parsed.data.jurisdictionCode,
		});
	if (!existingActivities.ok) {
		return existingActivities;
	}
	const activityRange = validateActivityEffectiveRange({
		candidate: effectivePeriod,
		existing: existingActivities.data,
		activityType: parsed.data.classification,
		activityCode: parsed.data.activityCode,
		jurisdictionCode: parsed.data.jurisdictionCode,
	});
	if (!activityRange.ok) {
		return activityRange;
	}

	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: registerCompanyActivityInputSchema,
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
				classificationSystem: "registered_activity",
				activityCode: result.activityCode,
				jurisdictionCode: result.jurisdictionCode,
				effectiveFrom: result.effectiveFrom,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
			safeMetadata: {
				change_type: "company_activity",
				classification: parsed.data.classification,
			},
		},
		serializeResult: serializeActivityForReplay,
		work: (transaction, context) =>
			dependencies.activityStore.registerCompanyActivity({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				activityCode: parsed.data.activityCode,
				classification: parsed.data.classification,
				jurisdictionCode: parsed.data.jurisdictionCode,
				regulatorCode: parsed.data.regulatorCode ?? null,
				description: parsed.data.description,
				effectivePeriod,
				recordedAt: context.occurredAt,
				recordedByUserId: options.actorUserId,
				sourceDocumentId,
				expectedCompanyVersion: parsed.data.expectedCompanyVersion,
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

function legalCompanyNotFound(): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "Corporate Administration legal company was not found.",
	});
}

function staleCompanyVersion(
	_expectedVersion: number,
	_actualVersion: number,
): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Corporate Administration legal company version is stale.",
	});
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
