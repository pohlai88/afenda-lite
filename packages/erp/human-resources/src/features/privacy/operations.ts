import { errorResult, type Result } from "@afenda/errors";
import type {
	HumanResourcesOperationId,
	HumanResourcesOperationKind,
	HumanResourcesResourceContext,
} from "../../kernel/authorization/authorization-types";
import { authorizeHumanResourcesOperation } from "../../kernel/authorization/contextual-authorization";
import {
	HUMAN_RESOURCES_PERMISSION_PRIVACY_ANONYMIZE_EVALUATE,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_ANONYMIZE_EXECUTE,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_EXPORT,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_LEGAL_HOLD_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_RETENTION_EVALUATE,
	type HumanResourcesPermission,
} from "../../kernel/authorization/permissions";
import { authorizationDecisionToFailure } from "../../kernel/authorization/run-authorized-operation";
import {
	type HumanResourcesCommandOptions,
	requirePrivacyPort,
	resolveCommandDeps,
} from "../../kernel/execution/command-options";
import type { HumanResourcesEmployeeId } from "../../kernel/identity/brands";
import {
	authorizationReasonFromFailure,
	observeAuthorizedOperationResult,
	observeHrPrivacyOperationResult,
} from "../../kernel/observability/operation-observability";
import type { HrPrivacyOperation } from "../../kernel/observability/types";
import {
	HUMAN_RESOURCES_RETENTION_POLICIES,
	type HumanResourcesAnonymizationEvaluation,
	type HumanResourcesPrivacyCase,
	type HumanResourcesRetentionClassification,
	type HumanResourcesRetentionEvaluation,
	type HumanResourcesSubjectExportBundle,
} from "./contract";
import {
	HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_PLACE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_RELEASE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_RESTRICTION_LIFT,
	HUMAN_RESOURCES_COMMAND_PRIVACY_RESTRICTION_PLACE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_SUBJECT_ANONYMIZE,
	HUMAN_RESOURCES_QUERY_PRIVACY_ANONYMIZATION_EVALUATE,
	HUMAN_RESOURCES_QUERY_PRIVACY_CASE_GET,
	HUMAN_RESOURCES_QUERY_PRIVACY_RETENTION_EVALUATE,
	HUMAN_RESOURCES_QUERY_PRIVACY_SUBJECT_EXPORT,
} from "./operation-registry";
import { projectHumanResourcesPrivacyExportStore } from "./store";
import { collectHumanResourcesSubjectData } from "./subject-data-collector";

export interface HumanResourcesPrivacyOperationInput {
	actorUserId: string;
	classifications?: readonly HumanResourcesRetentionClassification[];
	correlationId: string;
	legalBasis?: string;
	organizationId: string;
	personId: HumanResourcesEmployeeId;
	requestedAt?: string;
}

export type ExportHumanResourcesSubjectDataInput =
	HumanResourcesPrivacyOperationInput;

export type EvaluateHumanResourcesAnonymizationInput =
	HumanResourcesPrivacyOperationInput;

export type EvaluateHumanResourcesRetentionInput =
	HumanResourcesPrivacyOperationInput;

export type PlaceHumanResourcesLegalHoldInput =
	HumanResourcesPrivacyOperationInput & {
		holdReference: string;
		classifications: readonly HumanResourcesRetentionClassification[];
	};

export interface ReleaseHumanResourcesLegalHoldInput {
	actorUserId: string;
	correlationId: string;
	legalHoldId: string;
	organizationId: string;
	reason: string;
	releasedAt?: string;
}

export type AnonymizeHumanResourcesSubjectInput =
	HumanResourcesPrivacyOperationInput & {
		classifications: readonly HumanResourcesRetentionClassification[];
	};

export type RestrictEmployeeDataInput = HumanResourcesPrivacyOperationInput & {
	classifications: readonly HumanResourcesRetentionClassification[];
	restrictionReference: string;
};

export interface LiftEmployeeDataRestrictionInput {
	actorUserId: string;
	correlationId: string;
	liftedAt?: string;
	organizationId: string;
	reason: string;
	restrictionId: string;
}

function privacyContextFromInput(
	input: HumanResourcesPrivacyOperationInput,
	defaultLegalBasis: string,
): {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	subjectEmployeeId: HumanResourcesEmployeeId;
	requestedAt: string;
	legalBasis: string;
} {
	return {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		subjectEmployeeId: input.personId,
		requestedAt: input.requestedAt ?? new Date().toISOString(),
		legalBasis: input.legalBasis ?? defaultLegalBasis,
	};
}

function subjectResourceContext(
	input: HumanResourcesPrivacyOperationInput,
): HumanResourcesResourceContext {
	return {
		organizationId: input.organizationId,
		kind: "privacy_subject",
		subjectPersonId: input.personId,
		subjectEmployeeId: input.personId,
	};
}

async function authorizePrivacyOperation(
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
	},
	options: HumanResourcesCommandOptions,
	config: {
		operationId: HumanResourcesOperationId;
		operationKind: "command" | "query";
		requiredPermission: HumanResourcesPermission;
		resource: HumanResourcesResourceContext;
	},
): Promise<Result<void>> {
	const authorization = await authorizeHumanResourcesOperation(
		{
			operationId: config.operationId,
			operationKind: config.operationKind,
			requiredPermission: config.requiredPermission,
			actor: {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
			},
			resource: config.resource,
		},
		options,
	);
	if (!authorization.ok) {
		return authorization;
	}
	if (!authorization.data.allowed) {
		return authorizationDecisionToFailure(
			authorization.data,
			config.operationId,
		);
	}
	return errorResult.ok(undefined);
}

async function observePrivacyOperationResult<T>(input: {
	operationId: HumanResourcesOperationId;
	operationKind: HumanResourcesOperationKind;
	privacyOperation: HrPrivacyOperation;
	startedAtMs: number;
	observability: HumanResourcesCommandOptions["observability"];
	result: Result<T>;
}): Promise<Result<T>> {
	const authorizationReason =
		!input.result.ok &&
		(input.result.code === "UNAUTHORIZED" || input.result.code === "FORBIDDEN")
			? authorizationReasonFromFailure(input.result)
			: undefined;
	const observedResult = await observeAuthorizedOperationResult({
		operationId: input.operationId,
		operationKind: input.operationKind,
		observability: input.observability,
		startedAtMs: input.startedAtMs,
		result: input.result,
		...(authorizationReason === undefined ? {} : { authorizationReason }),
	});
	return observeHrPrivacyOperationResult({
		operation: input.privacyOperation,
		observability: input.observability,
		result: observedResult,
	});
}

async function exportHumanResourcesSubjectDataCore(
	input: ExportHumanResourcesSubjectDataInput,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HumanResourcesSubjectExportBundle>> {
	const authorized = await authorizePrivacyOperation(input, options, {
		operationId: HUMAN_RESOURCES_QUERY_PRIVACY_SUBJECT_EXPORT,
		operationKind: "query",
		requiredPermission: HUMAN_RESOURCES_PERMISSION_PRIVACY_EXPORT,
		resource: subjectResourceContext(input),
	});
	if (!authorized.ok) {
		return authorized;
	}

	const privacyResult = requirePrivacyPort(options);
	if (!privacyResult.ok) {
		return privacyResult;
	}

	const restrictionContext = privacyContextFromInput(
		input,
		"data_subject_request",
	);
	const restriction =
		await privacyResult.data.evaluateRestriction(restrictionContext);
	if (!restriction.ok) {
		return restriction;
	}
	if (restriction.data.restricted) {
		// Restriction ≠ erasure (A3/C7): the subject's rows survive but are
		// excluded from exports/read models until the restriction is lifted
		// through the audited liftEmployeeDataRestriction command.
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"This subject's data is restricted and excluded from export.",
		});
	}

	const { store } = resolveCommandDeps(options);
	const collected = await collectHumanResourcesSubjectData({
		organizationId: input.organizationId,
		subjectEmployeeId: input.personId,
		correlationId: input.correlationId,
		store: projectHumanResourcesPrivacyExportStore(store),
		...(input.requestedAt === undefined
			? {}
			: { generatedAt: input.requestedAt }),
	});
	if (!collected.ok) {
		return collected;
	}

	const portExport = await privacyResult.data.exportSubject(
		privacyContextFromInput(input, "data_subject_request"),
	);
	if (!portExport.ok) {
		return portExport;
	}

	return errorResult.ok({
		...collected.data,
		exportReference: portExport.data.exportReference,
		recordCount: collected.data.records.length,
	});
}

async function getHumanResourcesPrivacyCaseCore(
	input: HumanResourcesPrivacyOperationInput,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HumanResourcesPrivacyCase>> {
	const authorized = await authorizePrivacyOperation(input, options, {
		operationId: HUMAN_RESOURCES_QUERY_PRIVACY_CASE_GET,
		operationKind: "query",
		requiredPermission: HUMAN_RESOURCES_PERMISSION_PRIVACY_EXPORT,
		resource: subjectResourceContext(input),
	});
	if (!authorized.ok) {
		return authorized;
	}

	const privacyResult = requirePrivacyPort(options);
	if (!privacyResult.ok) {
		return privacyResult;
	}

	return privacyResult.data.getSubjectPrivacyCase(
		privacyContextFromInput(input, "privacy_case_read"),
	);
}

async function evaluateHumanResourcesAnonymizationCore(
	input: EvaluateHumanResourcesAnonymizationInput,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HumanResourcesAnonymizationEvaluation>> {
	const authorized = await authorizePrivacyOperation(input, options, {
		operationId: HUMAN_RESOURCES_QUERY_PRIVACY_ANONYMIZATION_EVALUATE,
		operationKind: "query",
		requiredPermission: HUMAN_RESOURCES_PERMISSION_PRIVACY_ANONYMIZE_EVALUATE,
		resource: subjectResourceContext(input),
	});
	if (!authorized.ok) {
		return authorized;
	}

	const privacyResult = requirePrivacyPort(options);
	if (!privacyResult.ok) {
		return privacyResult;
	}

	const context = privacyContextFromInput(input, "anonymization_request");
	return privacyResult.data.evaluateAnonymization({
		...context,
		...(input.classifications === undefined
			? {}
			: { classifications: input.classifications }),
	});
}

async function evaluateHumanResourcesRetentionCore(
	input: EvaluateHumanResourcesRetentionInput,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HumanResourcesRetentionEvaluation>> {
	const authorized = await authorizePrivacyOperation(input, options, {
		operationId: HUMAN_RESOURCES_QUERY_PRIVACY_RETENTION_EVALUATE,
		operationKind: "query",
		requiredPermission: HUMAN_RESOURCES_PERMISSION_PRIVACY_RETENTION_EVALUATE,
		resource: subjectResourceContext(input),
	});
	if (!authorized.ok) {
		return authorized;
	}

	return errorResult.ok({
		policies: Object.values(HUMAN_RESOURCES_RETENTION_POLICIES),
	});
}

async function placeHumanResourcesLegalHoldCore(
	input: PlaceHumanResourcesLegalHoldInput,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ legalHoldId: string }>> {
	const authorized = await authorizePrivacyOperation(input, options, {
		operationId: HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_PLACE,
		operationKind: "command",
		requiredPermission: HUMAN_RESOURCES_PERMISSION_PRIVACY_LEGAL_HOLD_MANAGE,
		resource: subjectResourceContext(input),
	});
	if (!authorized.ok) {
		return authorized;
	}

	const privacyResult = requirePrivacyPort(options);
	if (!privacyResult.ok) {
		return privacyResult;
	}

	const context = privacyContextFromInput(input, "legal_hold");
	return privacyResult.data.placeLegalHold({
		...context,
		holdReference: input.holdReference,
		classifications: input.classifications,
	});
}

async function releaseHumanResourcesLegalHoldCore(
	input: ReleaseHumanResourcesLegalHoldInput,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<void>> {
	const authorized = await authorizePrivacyOperation(input, options, {
		operationId: HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_RELEASE,
		operationKind: "command",
		requiredPermission: HUMAN_RESOURCES_PERMISSION_PRIVACY_LEGAL_HOLD_MANAGE,
		resource: {
			organizationId: input.organizationId,
			kind: "privacy_subject",
		},
	});
	if (!authorized.ok) {
		return authorized;
	}

	const privacyResult = requirePrivacyPort(options);
	if (!privacyResult.ok) {
		return privacyResult;
	}

	return privacyResult.data.releaseLegalHold({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		legalHoldId: input.legalHoldId,
		reason: input.reason,
		releasedAt: input.releasedAt ?? new Date().toISOString(),
	});
}

async function restrictEmployeeDataCore(
	input: RestrictEmployeeDataInput,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ restrictionId: string }>> {
	const authorized = await authorizePrivacyOperation(input, options, {
		operationId: HUMAN_RESOURCES_COMMAND_PRIVACY_RESTRICTION_PLACE,
		operationKind: "command",
		requiredPermission: HUMAN_RESOURCES_PERMISSION_PRIVACY_LEGAL_HOLD_MANAGE,
		resource: subjectResourceContext(input),
	});
	if (!authorized.ok) {
		return authorized;
	}

	const privacyResult = requirePrivacyPort(options);
	if (!privacyResult.ok) {
		return privacyResult;
	}

	const context = privacyContextFromInput(input, "processing_restriction");
	return privacyResult.data.restrictSubject({
		...context,
		classifications: input.classifications,
		restrictionReference: input.restrictionReference,
	});
}

async function liftEmployeeDataRestrictionCore(
	input: LiftEmployeeDataRestrictionInput,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<void>> {
	const authorized = await authorizePrivacyOperation(input, options, {
		operationId: HUMAN_RESOURCES_COMMAND_PRIVACY_RESTRICTION_LIFT,
		operationKind: "command",
		requiredPermission: HUMAN_RESOURCES_PERMISSION_PRIVACY_LEGAL_HOLD_MANAGE,
		resource: {
			organizationId: input.organizationId,
			kind: "privacy_subject",
		},
	});
	if (!authorized.ok) {
		return authorized;
	}

	const privacyResult = requirePrivacyPort(options);
	if (!privacyResult.ok) {
		return privacyResult;
	}

	return privacyResult.data.liftRestriction({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		restrictionId: input.restrictionId,
		reason: input.reason,
		liftedAt: input.liftedAt ?? new Date().toISOString(),
	});
}

async function anonymizeHumanResourcesSubjectCore(
	input: AnonymizeHumanResourcesSubjectInput,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ anonymizedRecordCount: number }>> {
	const authorized = await authorizePrivacyOperation(input, options, {
		operationId: HUMAN_RESOURCES_COMMAND_PRIVACY_SUBJECT_ANONYMIZE,
		operationKind: "command",
		requiredPermission: HUMAN_RESOURCES_PERMISSION_PRIVACY_ANONYMIZE_EXECUTE,
		resource: subjectResourceContext(input),
	});
	if (!authorized.ok) {
		return authorized;
	}

	const privacyResult = requirePrivacyPort(options);
	if (!privacyResult.ok) {
		return privacyResult;
	}

	const context = privacyContextFromInput(input, "anonymization_request");
	const restriction = await privacyResult.data.evaluateRestriction(context);
	if (!restriction.ok) {
		return restriction;
	}
	if (restriction.data.restricted) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Anonymization is blocked while this subject's data is restricted.",
		});
	}

	return privacyResult.data.anonymizeSubject({
		...context,
		classifications: input.classifications,
	});
}

export async function exportHumanResourcesSubjectData(
	input: ExportHumanResourcesSubjectDataInput,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HumanResourcesSubjectExportBundle>> {
	const startedAtMs = Date.now();
	return observePrivacyOperationResult({
		operationId: HUMAN_RESOURCES_QUERY_PRIVACY_SUBJECT_EXPORT,
		operationKind: "query",
		privacyOperation: "export",
		startedAtMs,
		observability: options.observability,
		result: await exportHumanResourcesSubjectDataCore(input, options),
	});
}

export async function getHumanResourcesPrivacyCase(
	input: HumanResourcesPrivacyOperationInput,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HumanResourcesPrivacyCase>> {
	const startedAtMs = Date.now();
	return observePrivacyOperationResult({
		operationId: HUMAN_RESOURCES_QUERY_PRIVACY_CASE_GET,
		operationKind: "query",
		privacyOperation: "access",
		startedAtMs,
		observability: options.observability,
		result: await getHumanResourcesPrivacyCaseCore(input, options),
	});
}

export async function evaluateHumanResourcesAnonymization(
	input: EvaluateHumanResourcesAnonymizationInput,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HumanResourcesAnonymizationEvaluation>> {
	const startedAtMs = Date.now();
	return observePrivacyOperationResult({
		operationId: HUMAN_RESOURCES_QUERY_PRIVACY_ANONYMIZATION_EVALUATE,
		operationKind: "query",
		privacyOperation: "erase",
		startedAtMs,
		observability: options.observability,
		result: await evaluateHumanResourcesAnonymizationCore(input, options),
	});
}

export async function evaluateHumanResourcesRetention(
	input: EvaluateHumanResourcesRetentionInput,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HumanResourcesRetentionEvaluation>> {
	const startedAtMs = Date.now();
	return observePrivacyOperationResult({
		operationId: HUMAN_RESOURCES_QUERY_PRIVACY_RETENTION_EVALUATE,
		operationKind: "query",
		privacyOperation: "access",
		startedAtMs,
		observability: options.observability,
		result: await evaluateHumanResourcesRetentionCore(input, options),
	});
}

export async function placeHumanResourcesLegalHold(
	input: PlaceHumanResourcesLegalHoldInput,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ legalHoldId: string }>> {
	const startedAtMs = Date.now();
	return observePrivacyOperationResult({
		operationId: HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_PLACE,
		operationKind: "command",
		privacyOperation: "rectify",
		startedAtMs,
		observability: options.observability,
		result: await placeHumanResourcesLegalHoldCore(input, options),
	});
}

export async function releaseHumanResourcesLegalHold(
	input: ReleaseHumanResourcesLegalHoldInput,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<void>> {
	const startedAtMs = Date.now();
	return observePrivacyOperationResult({
		operationId: HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_RELEASE,
		operationKind: "command",
		privacyOperation: "rectify",
		startedAtMs,
		observability: options.observability,
		result: await releaseHumanResourcesLegalHoldCore(input, options),
	});
}

export async function restrictEmployeeData(
	input: RestrictEmployeeDataInput,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ restrictionId: string }>> {
	const startedAtMs = Date.now();
	return observePrivacyOperationResult({
		operationId: HUMAN_RESOURCES_COMMAND_PRIVACY_RESTRICTION_PLACE,
		operationKind: "command",
		privacyOperation: "rectify",
		startedAtMs,
		observability: options.observability,
		result: await restrictEmployeeDataCore(input, options),
	});
}

export async function liftEmployeeDataRestriction(
	input: LiftEmployeeDataRestrictionInput,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<void>> {
	const startedAtMs = Date.now();
	return observePrivacyOperationResult({
		operationId: HUMAN_RESOURCES_COMMAND_PRIVACY_RESTRICTION_LIFT,
		operationKind: "command",
		privacyOperation: "rectify",
		startedAtMs,
		observability: options.observability,
		result: await liftEmployeeDataRestrictionCore(input, options),
	});
}

export async function anonymizeHumanResourcesSubject(
	input: AnonymizeHumanResourcesSubjectInput,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ anonymizedRecordCount: number }>> {
	const startedAtMs = Date.now();
	return observePrivacyOperationResult({
		operationId: HUMAN_RESOURCES_COMMAND_PRIVACY_SUBJECT_ANONYMIZE,
		operationKind: "command",
		privacyOperation: "erase",
		startedAtMs,
		observability: options.observability,
		result: await anonymizeHumanResourcesSubjectCore(input, options),
	});
}
