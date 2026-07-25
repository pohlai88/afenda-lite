import { ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesEmployeeId } from "../brands";
import {
	type HumanResourcesCommandOptions,
	requirePrivacyPort,
	resolveCommandDeps,
} from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_PLACE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_RELEASE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_SUBJECT_ANONYMIZE,
	HUMAN_RESOURCES_QUERY_PRIVACY_ANONYMIZATION_EVALUATE,
	HUMAN_RESOURCES_QUERY_PRIVACY_CASE_GET,
	HUMAN_RESOURCES_QUERY_PRIVACY_RETENTION_EVALUATE,
	HUMAN_RESOURCES_QUERY_PRIVACY_SUBJECT_EXPORT,
} from "../module-ids";
import {
	HUMAN_RESOURCES_PERMISSION_PRIVACY_ANONYMIZE_EVALUATE,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_ANONYMIZE_EXECUTE,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_EXPORT,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_LEGAL_HOLD_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_RETENTION_EVALUATE,
	type HumanResourcesPermission,
} from "../permissions";
import {
	HUMAN_RESOURCES_RETENTION_POLICIES,
	type HumanResourcesAnonymizationEvaluation,
	type HumanResourcesPrivacyCase,
	type HumanResourcesRetentionClassification,
	type HumanResourcesRetentionEvaluation,
	type HumanResourcesSubjectExportBundle,
} from "../privacy";
import type {
	HumanResourcesOperationId,
	HumanResourcesResourceContext,
} from "../shared/authorization-types";
import { authorizeHumanResourcesOperation } from "../shared/contextual-authorization";
import { authorizationDecisionToFailure } from "../shared/run-authorized-operation";
import { collectHumanResourcesSubjectData } from "./subject-data-collector";

export type HumanResourcesPrivacyOperationInput = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	personId: HumanResourcesEmployeeId;
	requestedAt?: string;
	legalBasis?: string;
	classifications?: readonly HumanResourcesRetentionClassification[];
};

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

export type ReleaseHumanResourcesLegalHoldInput = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	legalHoldId: string;
	reason: string;
	releasedAt?: string;
};

export type AnonymizeHumanResourcesSubjectInput =
	HumanResourcesPrivacyOperationInput & {
		classifications: readonly HumanResourcesRetentionClassification[];
	};

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
	return ok(undefined);
}

export async function exportHumanResourcesSubjectData(
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

	const { store } = resolveCommandDeps(options);
	const collected = await collectHumanResourcesSubjectData({
		organizationId: input.organizationId,
		subjectEmployeeId: input.personId,
		correlationId: input.correlationId,
		store,
		generatedAt: input.requestedAt,
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

	return ok({
		...collected.data,
		exportReference: portExport.data.exportReference,
		recordCount: collected.data.records.length,
	});
}

export async function getHumanResourcesPrivacyCase(
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

export async function evaluateHumanResourcesAnonymization(
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

export async function evaluateHumanResourcesRetention(
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

	return ok({
		policies: Object.values(HUMAN_RESOURCES_RETENTION_POLICIES),
	});
}

export async function placeHumanResourcesLegalHold(
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

export async function releaseHumanResourcesLegalHold(
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

export async function anonymizeHumanResourcesSubject(
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
	return privacyResult.data.anonymizeSubject({
		...context,
		classifications: input.classifications,
	});
}
