import { errorResult, type Result } from "@afenda/errors";

import {
	governanceInvalidTransition,
	governancePolicyMismatch,
	governanceReasonRequired,
} from "./governance-errors";
import type { GovernanceEventType } from "./governance-events";
import type {
	ImportBatchStatus,
	ImportDeterministicMatch,
	ImportMode,
	ImportRowOperation,
} from "./import-types";
import type { GovernancePermission } from "./permissions";

export const IMPORT_DETERMINISTIC_MATCH_KEYS = [
	"normalized_canonical_code",
	"approved_external_identifier",
] as const;
export type ImportDeterministicMatchKey =
	(typeof IMPORT_DETERMINISTIC_MATCH_KEYS)[number];

export const IMPORT_TRANSITION_AUTHORITIES = [
	"actor",
	"system",
	"import_orchestrator",
] as const;
export type ImportTransitionAuthority =
	(typeof IMPORT_TRANSITION_AUTHORITIES)[number];

type ActorTransition = Readonly<{
	authority: "actor";
	requiredPermission: GovernancePermission;
}>;

type InternalTransition = Readonly<{
	authority: "system" | "import_orchestrator";
	requiredPermission: null;
}>;

export type ImportBatchTransitionDefinition = Readonly<{
	operation: string;
	from: readonly ImportBatchStatus[];
	to: ImportBatchStatus;
	reasonRequired: boolean;
	expectedWorkflowVersionRequired: true;
	eventType: GovernanceEventType;
	auditAction: string;
	reversible: false;
}> &
	(ActorTransition | InternalTransition);

export type ImportTransitionDefinition = ImportBatchTransitionDefinition;

export const IMPORT_BATCH_TRANSITIONS = {
	parse: {
		operation: "import_batch.parse",
		from: ["claimed"],
		to: "claimed",
		authority: "import_orchestrator",
		requiredPermission: null,
		reasonRequired: false,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.import_batch.parsed",
		auditAction: "import_batch.parse",
		reversible: false,
	},
	startValidation: {
		operation: "import_batch.validation_start",
		from: ["claimed"],
		to: "validating",
		authority: "import_orchestrator",
		requiredPermission: null,
		reasonRequired: false,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.import_batch.validation_started",
		auditAction: "import_batch.validation_start",
		reversible: false,
	},
	markValidated: {
		operation: "import_batch.validated",
		from: ["validating"],
		to: "approval_pending",
		authority: "import_orchestrator",
		requiredPermission: null,
		reasonRequired: false,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.import_batch.validated",
		auditAction: "import_batch.validated",
		reversible: false,
	},
	markValidationFailed: {
		operation: "import_batch.validation_failed",
		from: ["validating"],
		to: "failed",
		authority: "import_orchestrator",
		requiredPermission: null,
		reasonRequired: true,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.import_batch.validation_failed",
		auditAction: "import_batch.validation_failed",
		reversible: false,
	},
	requestApproval: {
		operation: "import_batch.approval_request",
		from: ["validating"],
		to: "approval_pending",
		authority: "actor",
		requiredPermission: "master_data.import_submit",
		reasonRequired: false,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.import_batch.submitted",
		auditAction: "import_batch.submit",
		reversible: false,
	},
	approve: {
		operation: "import_batch.approve",
		from: ["approval_pending"],
		to: "approved",
		authority: "actor",
		requiredPermission: "master_data.import_approve",
		reasonRequired: true,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.import_batch.approved",
		auditAction: "import_batch.approve",
		reversible: false,
	},
	reject: {
		operation: "import_batch.reject",
		from: ["approval_pending"],
		to: "cancelled",
		authority: "actor",
		requiredPermission: "master_data.import_reject",
		reasonRequired: true,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.import_batch.rejected",
		auditAction: "import_batch.reject",
		reversible: false,
	},
	startApply: {
		operation: "import_batch.apply_start",
		from: ["approved"],
		to: "applying",
		authority: "actor",
		requiredPermission: "master_data.import_apply",
		reasonRequired: false,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.import_batch.apply_started",
		auditAction: "import_batch.apply_start",
		reversible: false,
	},
	markApplied: {
		operation: "import_batch.applied",
		from: ["applying"],
		to: "applied",
		authority: "import_orchestrator",
		requiredPermission: null,
		reasonRequired: false,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.import_batch.applied",
		auditAction: "import_batch.applied",
		reversible: false,
	},
	markPartiallyApplied: {
		operation: "import_batch.partially_applied",
		from: ["applying"],
		to: "partially_applied",
		authority: "import_orchestrator",
		requiredPermission: null,
		reasonRequired: true,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.import_batch.partially_applied",
		auditAction: "import_batch.partially_applied",
		reversible: false,
	},
	markFailed: {
		operation: "import_batch.failed",
		from: ["applying"],
		to: "failed",
		authority: "import_orchestrator",
		requiredPermission: null,
		reasonRequired: true,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.import_batch.failed",
		auditAction: "import_batch.failed",
		reversible: false,
	},
	cancel: {
		operation: "import_batch.cancel",
		from: ["claimed", "validating", "approval_pending", "approved"],
		to: "cancelled",
		authority: "actor",
		requiredPermission: "master_data.import_cancel",
		reasonRequired: true,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.import_batch.cancelled",
		auditAction: "import_batch.cancel",
		reversible: false,
	},
	expire: {
		operation: "import_batch.expire",
		from: ["approval_pending", "approved"],
		to: "cancelled",
		authority: "system",
		requiredPermission: null,
		reasonRequired: false,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.import_batch.expired",
		auditAction: "import_batch.expire",
		reversible: false,
	},
	supersede: {
		operation: "import_batch.supersede",
		from: ["claimed", "validating", "approval_pending", "approved", "failed"],
		to: "cancelled",
		authority: "actor",
		requiredPermission: "master_data.import_create",
		reasonRequired: true,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.import_batch.superseded",
		auditAction: "import_batch.supersede",
		reversible: false,
	},
} as const satisfies Record<string, ImportBatchTransitionDefinition>;

export type ImportBatchTransitionName = keyof typeof IMPORT_BATCH_TRANSITIONS;
export const IMPORT_TRANSITIONS = IMPORT_BATCH_TRANSITIONS;
export type ImportTransitionName = keyof typeof IMPORT_TRANSITIONS;

export function decideImportBatchTransition(input: {
	currentStatus: ImportBatchStatus;
	transition: ImportBatchTransitionName;
	reason?: string;
}): Result<ImportBatchTransitionDefinition> {
	const definition = IMPORT_BATCH_TRANSITIONS[input.transition];
	const sourceStatuses: readonly ImportBatchStatus[] = definition.from;
	if (!sourceStatuses.includes(input.currentStatus)) {
		return governanceInvalidTransition({
			operation: definition.operation,
			currentStatus: input.currentStatus,
			targetStatus: definition.to,
		});
	}
	if (definition.reasonRequired && !input.reason?.trim()) {
		return governanceReasonRequired({
			operation: definition.operation,
			requiredReason: "decision_reason",
		});
	}
	return errorResult.ok(definition);
}

export function decideImportTransition(input: {
	currentStatus: ImportBatchStatus;
	transition: ImportTransitionName;
	reason?: string;
}): Result<ImportTransitionDefinition> {
	return decideImportBatchTransition(input);
}

export function decideImportRowOperation(input: {
	mode: ImportMode;
	match: ImportDeterministicMatch;
}): Result<ImportRowOperation> {
	const { match, mode } = input;
	switch (match.status) {
		case "not_evaluated":
		case "ambiguous":
		case "invalid_key":
		case "not_permitted":
			return errorResult.ok("reject");
		case "no_match":
			return mode === "update_existing"
				? errorResult.ok("reject")
				: errorResult.ok("create");
		case "matched":
			if (match.matchedTargetId.trim().length === 0) {
				return governancePolicyMismatch({
					policyId: match.policyId,
					operation: "import.row.decide_operation",
					expected: {
						matchStatus: "matched",
						matchedTargetId: "non-empty",
					},
					actual: {
						matchStatus: match.status,
						matchedTargetId: match.matchedTargetId,
					},
				});
			}
			return mode === "create_only"
				? errorResult.ok("skip")
				: errorResult.ok("update");
		default:
			return assertNever(match);
	}
}

export function validateImportDeterministicMatch(input: {
	match: ImportDeterministicMatch;
}): Result<true> {
	const { match } = input;
	if (
		match.policyId.trim().length === 0 ||
		!Number.isSafeInteger(match.policyVersion) ||
		match.policyVersion < 1
	) {
		return invalidMatch(match, "valid policy identity");
	}

	switch (match.status) {
		case "matched":
			if (
				match.ruleId.trim().length === 0 ||
				match.matchedTargetId.trim().length === 0 ||
				!Number.isSafeInteger(match.matchedTargetVersion) ||
				match.matchedTargetVersion < 1 ||
				match.candidateTargetIds.length !== 1 ||
				match.candidateTargetIds[0] !== match.matchedTargetId
			) {
				return invalidMatch(match, "one uniquely matched entity with version");
			}
			break;
		case "not_evaluated":
		case "no_match":
			if (match.candidateTargetIds.length !== 0) {
				return invalidMatch(match, "no matched entity or candidates");
			}
			break;
		case "ambiguous":
			if (
				match.ruleId.trim().length === 0 ||
				match.candidateTargetIds.length < 2 ||
				new Set(match.candidateTargetIds).size !==
					match.candidateTargetIds.length ||
				match.candidateTargetIds.some(
					(candidateId) => candidateId.trim().length === 0,
				)
			) {
				return invalidMatch(
					match,
					"multiple unique candidates without an automatically selected target",
				);
			}
			break;
		case "invalid_key":
		case "not_permitted":
			if (
				match.candidateTargetIds.some(
					(candidateId) => candidateId.trim().length === 0,
				)
			) {
				return invalidMatch(match, "no selected target");
			}
			break;
		default:
			return assertNever(match);
	}
	return errorResult.ok(true);
}

export function modePermitsOperation(input: {
	mode: ImportMode;
	operation: ImportMutationOperation;
}): boolean {
	switch (input.mode) {
		case "create_or_update":
			return true;
		case "create_only":
			return input.operation === "create";
		case "update_existing":
			return input.operation === "update";
		default:
			return assertNever(input.mode);
	}
}

export type ImportMutationOperation = Extract<
	ImportRowOperation,
	"create" | "update"
>;

export function assertImportModePermitsOperation(input: {
	mode: ImportMode;
	operation: ImportMutationOperation;
}): Result<true> {
	if (modePermitsOperation(input)) {
		return errorResult.ok(true);
	}
	return governanceInvalidTransition({
		operation: `import.row.${input.operation}`,
		currentStatus: input.mode,
		targetStatus: input.operation,
	});
}

function invalidMatch(
	match: ImportDeterministicMatch,
	expected: string,
): Result<never> {
	return governancePolicyMismatch({
		policyId: match.policyId,
		operation: "import.match.validate",
		expected,
		actual: match,
	});
}

function assertNever(value: never): never {
	throw new Error(`Unsupported import workflow value: ${String(value)}`);
}
