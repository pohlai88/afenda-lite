import { fail, type Result } from "@afenda/errors/result";
import type { z } from "zod";

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
import type { OrganizationId } from "../../kernel/brands";
import { parseCorporateAdministrationInput } from "../../parse-input";
import {
	legalCompanyStatusRequiresApproval,
	validateLegalCompanyStatusTransition,
} from "../rules";
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
import {
	type DurableLegalCompanyCommandDependencies,
	runDurableCompanyCommand,
} from "./durable-command";

type LegalCompanyLifecycleDependencies =
	LegalCompanyLifecycleCommandDependencies &
		Pick<DurableLegalCompanyCommandDependencies, "runtime" | "createEventId"> &
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
	commandId: string;
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
	eventType:
		| "corporate_administration.legal_company.activated.v1"
		| "corporate_administration.legal_company.suspended.v1"
		| "corporate_administration.legal_company.struck_off_marked.v1"
		| "corporate_administration.legal_company.liquidation_entered.v1"
		| "corporate_administration.legal_company.dissolved.v1"
		| "corporate_administration.legal_company.restored.v1"
		| "corporate_administration.legal_company.archived.v1";
}>;

export function activateLegalCompany(
	input: ActivateLegalCompanyInput,
	options: LegalCompanyLifecycleOptions,
	dependencies: LegalCompanyLifecycleDependencies,
): Promise<Result<CompanyStatusHistory>> {
	return changeLegalCompanyStatus({
		commandId: "corporate-administration.legal-company.activate",
		permissionKey: "activateLegalCompany",
		targetStatus: "active",
		inputSchema: activateLegalCompanyInputSchema,
		input,
		eventType: "corporate_administration.legal_company.activated.v1",
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
		commandId: "corporate-administration.legal-company.suspend",
		permissionKey: "suspendLegalCompany",
		targetStatus: "suspended",
		inputSchema: suspendLegalCompanyInputSchema,
		input,
		eventType: "corporate_administration.legal_company.suspended.v1",
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
		commandId: "corporate-administration.legal-company.mark-struck-off",
		permissionKey: "markCompanyStruckOff",
		targetStatus: "struck_off",
		inputSchema: markCompanyStruckOffInputSchema,
		input,
		eventType: "corporate_administration.legal_company.struck_off_marked.v1",
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
		commandId: "corporate-administration.legal-company.enter-liquidation",
		permissionKey: "enterLiquidation",
		targetStatus: "in_liquidation",
		inputSchema: enterLiquidationInputSchema,
		input,
		eventType: "corporate_administration.legal_company.liquidation_entered.v1",
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
		commandId: "corporate-administration.legal-company.dissolve",
		permissionKey: "dissolveLegalCompany",
		targetStatus: "dissolved",
		inputSchema: dissolveLegalCompanyInputSchema,
		input,
		eventType: "corporate_administration.legal_company.dissolved.v1",
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
		commandId: "corporate-administration.legal-company.restore",
		permissionKey: "restoreLegalCompany",
		targetStatus: "restored",
		inputSchema: restoreLegalCompanyInputSchema,
		input,
		eventType: "corporate_administration.legal_company.restored.v1",
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
		commandId: "corporate-administration.legal-company.archive",
		permissionKey: "archiveLegalCompany",
		targetStatus: "archived",
		inputSchema: archiveLegalCompanyInputSchema,
		input,
		eventType: "corporate_administration.legal_company.archived.v1",
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
	if (!parsed.ok) return parsed;

	const authorized = await requireCorporateAdministrationPermission(
		config.options.authorization,
		{
			organizationId: config.options.organizationId,
			actorUserId: config.options.actorUserId,
			permission:
				CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS[config.permissionKey],
		},
	);
	if (!authorized.ok) return authorized;

	const identity = createCorporateAdministrationCommandFingerprint({
		schema: config.inputSchema,
		organizationId: config.options.organizationId,
		commandId: config.commandId,
		input: parsed.data,
	});
	if (!identity.ok) return identity;

	if (legalCompanyStatusRequiresApproval(config.targetStatus)) {
		const approved = await requireCorporateAdministrationApprovalIfConfigured(
			config.dependencies,
			{
				organizationId: config.options.organizationId,
				actorUserId: config.options.actorUserId,
				approvalRequestId: config.options.approvalRequestId,
				approvalDecisionId: config.options.approvalDecisionId,
				commandFingerprint: identity.data.fingerprint,
			},
		);
		if (!approved.ok) return approved;
	}

	const current = await config.dependencies.store.lockLegalCompany({
		organizationId: config.options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		expectedVersion: parsed.data.expectedCompanyVersion,
	});
	if (!current.ok) return current;
	if (current.data === null) return legalCompanyNotFound();
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
	if (!transition.ok) return transition;

	if (config.targetStatus === "active") {
		const completeness = await getActivationCompleteness({
			dependencies: config.dependencies,
			organizationId: config.options.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			asOf: parsed.data.effectiveFrom,
		});
		if (!completeness.ok) return completeness;
		if (!completeness.data.complete) {
			return fail(
				"VALIDATION_ERROR",
				"Corporate Administration legal company activation is incomplete.",
				corporateAdministrationErrorDetails(
					"CORPORATE_ADMINISTRATION_VALIDATION_FAILED",
					{ field: completeness.data.missing.join(",") },
				),
			);
		}
	}

	const source = await config.dependencies.referenceData.validateSourceDocument(
		{
			organizationId: config.options.organizationId,
			sourceDocumentId: parsed.data.sourceDocumentId,
		},
	);
	if (!source.ok) return source;
	if (source.data === null || !source.data.active) {
		return fail(
			source.data === null ? "VALIDATION_ERROR" : "CONFLICT",
			"Corporate Administration source document is not active.",
			corporateAdministrationErrorDetails(
				source.data === null
					? "CORPORATE_ADMINISTRATION_REFERENCE_INVALID"
					: "CORPORATE_ADMINISTRATION_REFERENCE_INACTIVE",
				{ field: "sourceDocumentId" },
			),
		);
	}
	const sourceDocumentId = source.data.sourceDocumentId;

	return runDurableCompanyCommand({
		commandId: config.commandId,
		fingerprintSchema: config.inputSchema,
		fingerprintInput: parsed.data,
		outputSchema: companyStatusHistorySchema,
		options: config.options,
		dependencies: config.dependencies,
		event: {
			type: config.eventType,
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
	if (!jurisdiction.ok) return jurisdiction;
	if (jurisdiction.data === null) missing.push("jurisdictionProfile");

	const name = await input.dependencies.nameStore.findCompanyNameAsOf({
		organizationId: input.organizationId,
		legalCompanyId: input.legalCompanyId,
		nameType: "legal",
		languageCode: "en",
		asOf: input.asOf,
	});
	if (!name.ok) return name;
	if (name.data === null) missing.push("legalName");

	const legalForm =
		await input.dependencies.legalFormStore.findCompanyLegalFormAsOf({
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			asOf: input.asOf,
		});
	if (!legalForm.ok) return legalForm;
	if (legalForm.data === null) missing.push("legalForm");

	const identifier =
		await input.dependencies.identifierStore.findCompanyIdentifierAsOf({
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			identifierType: "company_registration",
			asOf: input.asOf,
		});
	if (!identifier.ok) return identifier;
	if (identifier.data === null) missing.push("companyIdentifier");

	const financialYear =
		await input.dependencies.financialYearStore.findCompanyFinancialYearAsOf({
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			asOf: input.asOf,
		});
	if (!financialYear.ok) return financialYear;
	if (financialYear.data === null) missing.push("financialYear");

	const activities =
		await input.dependencies.activityStore.listCompanyActivitiesAsOf({
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			asOf: input.asOf,
		});
	if (!activities.ok) return activities;
	if (activities.data.length === 0) missing.push("registeredActivity");

	const registeredAddress =
		await input.dependencies.establishmentStore.findRegisteredAddressAsOf({
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			legalEstablishmentId: null,
			addressType: "registered_office",
			asOf: input.asOf,
		});
	if (!registeredAddress.ok) return registeredAddress;
	if (registeredAddress.data === null) missing.push("registeredAddress");

	return { ok: true, data: { complete: missing.length === 0, missing } };
}

function serializeStatusForReplay(result: CompanyStatusHistory): unknown {
	return {
		...result,
		recordedAt: result.recordedAt.toISOString(),
	};
}

function legalCompanyNotFound(): Result<never> {
	return fail(
		"NOT_FOUND",
		"Corporate Administration legal company was not found.",
		corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_NOT_FOUND", {
			entityType: "legalCompany",
		}),
	);
}

function staleCompanyVersion(
	expectedVersion: number,
	actualVersion: number,
): Result<never> {
	return fail(
		"CONFLICT",
		"Corporate Administration legal company version is stale.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_STALE_VERSION",
			{ expectedVersion, actualVersion },
		),
	);
}
