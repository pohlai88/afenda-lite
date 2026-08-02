// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Status changes coordinate policy, CAS, idempotency, audit, and outbox atomically.
// biome-ignore-all lint/style/useDestructuring: Explicit company state access keeps lifecycle evidence visible.
import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

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
import type { OrganizationId } from "../../kernel/brands";
import { parseCorporateAdministrationInput } from "../../parse-input";
import { validateLegalCompanyStatusTransition } from "../rules";
import {
	activateLegalCompanyInputSchema,
	archiveLegalCompanyInputSchema,
	companyStatusHistorySchema,
	dissolveLegalCompanyInputSchema,
	enterLiquidationInputSchema,
	markCompanyStruckOffInputSchema,
	restoreLegalCompanyInputSchema,
	suspendLegalCompanyInputSchema,
} from "../schemas";
import type { LegalCompanyLifecycleCommandDependencies } from "../store";
import type {
	ActivateLegalCompanyInput,
	ArchiveLegalCompanyInput,
	CompanyStatusHistory,
	DissolveLegalCompanyInput,
	EnterLiquidationInput,
	LegalCompanyStatus,
	MarkCompanyStruckOffInput,
	RestoreLegalCompanyInput,
	SuspendLegalCompanyInput,
} from "../types";

type LegalCompanyLifecycleDependencies =
	LegalCompanyLifecycleCommandDependencies &
		Pick<
			CorporateAdministrationCommandKernelDependencies,
			"runtime" | "createEventId"
		> &
		CorporateAdministrationApprovalVerificationDependencies;

type LegalCompanyLifecycleOptions = CorporateAdministrationCommandOptions &
	Partial<
		Pick<
			CorporateAdministrationApprovalCommandOptions,
			"approvalDecisionId" | "approvalRequestId"
		>
	>;

type ParsedLegalCompanyStatusInput = Readonly<{
	legalCompanyId: CompanyStatusHistory["legalCompanyId"];
	effectiveFrom: CompanyStatusHistory["effectiveFrom"];
	reason?: string | undefined;
	sourceDocumentId: string;
	expectedCompanyVersion: number;
}>;

type LegalCompanyLifecycleCommandConfig = Readonly<{
	operationId:
		| "activateLegalCompany"
		| "suspendLegalCompany"
		| "markCompanyStruckOff"
		| "enterLiquidation"
		| "dissolveLegalCompany"
		| "restoreLegalCompany"
		| "archiveLegalCompany";
	permissionKey:
		| "activateLegalCompany"
		| "suspendLegalCompany"
		| "markCompanyStruckOff"
		| "enterLiquidation"
		| "dissolveLegalCompany"
		| "restoreLegalCompany"
		| "archiveLegalCompany";
	targetStatus: LegalCompanyStatus;
	inputSchema: z.ZodType<ParsedLegalCompanyStatusInput>;
	input: unknown;
}>;

export function activateLegalCompany(
	input: ActivateLegalCompanyInput,
	options: LegalCompanyLifecycleOptions,
	dependencies: LegalCompanyLifecycleDependencies,
): Promise<Result<CompanyStatusHistory>> {
	return changeLegalCompanyStatus({
		operationId: "activateLegalCompany",
		permissionKey: "activateLegalCompany",
		targetStatus: "active",
		inputSchema: activateLegalCompanyInputSchema,
		input,
		options,
		dependencies,
	});
}

export function suspendLegalCompany(
	input: SuspendLegalCompanyInput,
	options: LegalCompanyLifecycleOptions,
	dependencies: LegalCompanyLifecycleDependencies,
): Promise<Result<CompanyStatusHistory>> {
	return changeLegalCompanyStatus({
		operationId: "suspendLegalCompany",
		permissionKey: "suspendLegalCompany",
		targetStatus: "suspended",
		inputSchema: suspendLegalCompanyInputSchema,
		input,
		options,
		dependencies,
	});
}

export function markCompanyStruckOff(
	input: MarkCompanyStruckOffInput,
	options: LegalCompanyLifecycleOptions,
	dependencies: LegalCompanyLifecycleDependencies,
): Promise<Result<CompanyStatusHistory>> {
	return changeLegalCompanyStatus({
		operationId: "markCompanyStruckOff",
		permissionKey: "markCompanyStruckOff",
		targetStatus: "struck_off",
		inputSchema: markCompanyStruckOffInputSchema,
		input,
		options,
		dependencies,
	});
}

export function enterLiquidation(
	input: EnterLiquidationInput,
	options: LegalCompanyLifecycleOptions,
	dependencies: LegalCompanyLifecycleDependencies,
): Promise<Result<CompanyStatusHistory>> {
	return changeLegalCompanyStatus({
		operationId: "enterLiquidation",
		permissionKey: "enterLiquidation",
		targetStatus: "in_liquidation",
		inputSchema: enterLiquidationInputSchema,
		input,
		options,
		dependencies,
	});
}

export function dissolveLegalCompany(
	input: DissolveLegalCompanyInput,
	options: LegalCompanyLifecycleOptions,
	dependencies: LegalCompanyLifecycleDependencies,
): Promise<Result<CompanyStatusHistory>> {
	return changeLegalCompanyStatus({
		operationId: "dissolveLegalCompany",
		permissionKey: "dissolveLegalCompany",
		targetStatus: "dissolved",
		inputSchema: dissolveLegalCompanyInputSchema,
		input,
		options,
		dependencies,
	});
}

export function restoreLegalCompany(
	input: RestoreLegalCompanyInput,
	options: LegalCompanyLifecycleOptions,
	dependencies: LegalCompanyLifecycleDependencies,
): Promise<Result<CompanyStatusHistory>> {
	return changeLegalCompanyStatus({
		operationId: "restoreLegalCompany",
		permissionKey: "restoreLegalCompany",
		targetStatus: "restored",
		inputSchema: restoreLegalCompanyInputSchema,
		input,
		options,
		dependencies,
	});
}

export function archiveLegalCompany(
	input: ArchiveLegalCompanyInput,
	options: LegalCompanyLifecycleOptions,
	dependencies: LegalCompanyLifecycleDependencies,
): Promise<Result<CompanyStatusHistory>> {
	return changeLegalCompanyStatus({
		operationId: "archiveLegalCompany",
		permissionKey: "archiveLegalCompany",
		targetStatus: "archived",
		inputSchema: archiveLegalCompanyInputSchema,
		input,
		options,
		dependencies,
	});
}

async function changeLegalCompanyStatus(
	config: LegalCompanyLifecycleCommandConfig &
		Readonly<{
			options: LegalCompanyLifecycleOptions;
			dependencies: LegalCompanyLifecycleDependencies;
		}>,
): Promise<Result<CompanyStatusHistory>> {
	const parsed = parseCorporateAdministrationInput(
		config.inputSchema,
		config.input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const authorized = await authorizeCorporateAdministrationCommand(
		config.operationId,
		config.options,
	);
	if (!authorized.ok) {
		return authorized;
	}

	const current = await config.dependencies.store.lockLegalCompany({
		organizationId: config.options.organizationId,
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

	const transition = validateLegalCompanyStatusTransition({
		from: current.data.state,
		to: config.targetStatus,
	});
	if (!transition.ok) {
		return transition;
	}

	if (config.targetStatus === "active") {
		const completeness = await getActivationCompleteness({
			dependencies: config.dependencies,
			organizationId: config.options.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			asOf: parsed.data.effectiveFrom,
		});
		if (!completeness.ok) {
			return completeness;
		}
		if (!completeness.data.complete) {
			return errorResult.fail("VALIDATION_ERROR", {
				publicMessage:
					"Corporate Administration legal company activation is incomplete.",
			});
		}
	}

	const source = await config.dependencies.referenceData.validateSourceDocument(
		{
			organizationId: config.options.organizationId,
			sourceDocumentId: parsed.data.sourceDocumentId,
		},
	);
	if (!source.ok) {
		return source;
	}
	if (source.data === null || !source.data.active) {
		return source.data === null
			? errorResult.fail("VALIDATION_ERROR", {
					publicMessage:
						"Corporate Administration source document is not active.",
				})
			: errorResult.fail("CONFLICT", {
					publicMessage:
						"Corporate Administration source document is not active.",
				});
	}
	const sourceDocumentId = source.data.sourceDocumentId;

	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: config.inputSchema,
		fingerprintInput: parsed.data,
		outputSchema: companyStatusHistorySchema,
		dependencies: config.dependencies,
		event: {
			operationType: "UPDATE",
			targetType: "ca_company_status_history",
			aggregateId: (result) => result.legalCompanyId,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				companyStatusHistoryId: result.id,
				status: result.status,
				effectiveFrom: result.effectiveFrom,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
			safeMetadata: { status: config.targetStatus },
		},
		serializeResult: serializeStatusForReplay,
		work: (transaction, context) =>
			config.dependencies.store.changeLegalCompanyStatus({
				organizationId: config.options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				status: config.targetStatus,
				effectiveFrom: parsed.data.effectiveFrom,
				recordedAt: context.occurredAt,
				recordedByUserId: config.options.actorUserId,
				reason: parsed.data.reason ?? null,
				sourceDocumentId,
				expectedCompanyVersion: parsed.data.expectedCompanyVersion,
				correlationId: config.options.correlationId,
				causationId: config.options.causationId,
				transaction,
			}),
	});
}

async function getActivationCompleteness(
	input: Readonly<{
		dependencies: LegalCompanyLifecycleCommandDependencies;
		organizationId: OrganizationId;
		legalCompanyId: CompanyStatusHistory["legalCompanyId"];
		asOf: CompanyStatusHistory["effectiveFrom"];
	}>,
): Promise<Result<{ complete: boolean; missing: readonly string[] }>> {
	const missing: string[] = [];
	const jurisdiction =
		await input.dependencies.store.findJurisdictionProfileAsOf({
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			asOf: input.asOf,
		});
	if (!jurisdiction.ok) {
		return jurisdiction;
	}
	if (jurisdiction.data === null) {
		missing.push("jurisdictionProfile");
	}

	const name = await input.dependencies.nameStore.findCompanyNameAsOf({
		organizationId: input.organizationId,
		legalCompanyId: input.legalCompanyId,
		nameType: "legal",
		languageCode: "en",
		asOf: input.asOf,
	});
	if (!name.ok) {
		return name;
	}
	if (name.data === null) {
		missing.push("legalName");
	}

	const legalForm =
		await input.dependencies.legalFormStore.findCompanyLegalFormAsOf({
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			asOf: input.asOf,
		});
	if (!legalForm.ok) {
		return legalForm;
	}
	if (legalForm.data === null) {
		missing.push("legalForm");
	}

	const identifier =
		await input.dependencies.identifierStore.findCompanyIdentifierAsOf({
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			identifierType: "company_registration",
			asOf: input.asOf,
		});
	if (!identifier.ok) {
		return identifier;
	}
	if (identifier.data === null) {
		missing.push("companyIdentifier");
	}

	const financialYear =
		await input.dependencies.financialYearStore.findCompanyFinancialYearAsOf({
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			asOf: input.asOf,
		});
	if (!financialYear.ok) {
		return financialYear;
	}
	if (financialYear.data === null) {
		missing.push("financialYear");
	}

	const activities =
		await input.dependencies.activityStore.listCompanyActivitiesAsOf({
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			asOf: input.asOf,
		});
	if (!activities.ok) {
		return activities;
	}
	if (activities.data.length === 0) {
		missing.push("registeredActivity");
	}

	const registeredAddress =
		await input.dependencies.establishmentStore.findRegisteredAddressAsOf({
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			legalEstablishmentId: null,
			addressType: "registered_office",
			asOf: input.asOf,
		});
	if (!registeredAddress.ok) {
		return registeredAddress;
	}
	if (registeredAddress.data === null) {
		missing.push("registeredAddress");
	}

	return { ok: true, data: { complete: missing.length === 0, missing } };
}

function serializeStatusForReplay(result: CompanyStatusHistory): unknown {
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
