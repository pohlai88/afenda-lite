import { ok, type Result } from "@afenda/errors/result";

import type {
	ChangeRequestStatus,
	ChangeRequestTransitionAuthority,
	ChangeRequestTransitionDefinition,
} from "./change-request-types";
import {
	governanceInvalidTransition,
	governancePolicyMismatch,
	governanceReasonRequired,
} from "./governance-errors";

export const CHANGE_REQUEST_TRANSITIONS = {
	submit: {
		operation: "submit",
		from: ["draft"],
		to: "submitted",
		authority: "actor",
		requiredPermission: "master_data.change_request_submit",
		reasonRequired: false,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.change_request.submitted",
		auditAction: "change_request.submit",
		reversible: false,
	},
	approve: {
		operation: "approve",
		from: ["submitted"],
		to: "approved",
		authority: "actor",
		requiredPermission: "master_data.change_request_approve",
		reasonRequired: true,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.change_request.approved",
		auditAction: "change_request.approve",
		reversible: false,
	},
	reject: {
		operation: "reject",
		from: ["submitted"],
		to: "rejected",
		authority: "actor",
		requiredPermission: "master_data.change_request_reject",
		reasonRequired: true,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.change_request.rejected",
		auditAction: "change_request.reject",
		reversible: false,
	},
	startApply: {
		operation: "startApply",
		from: ["approved"],
		to: "applying",
		authority: "actor",
		requiredPermission: "master_data.change_request_apply",
		reasonRequired: false,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.change_request.apply_started",
		auditAction: "change_request.apply_start",
		reversible: false,
	},
	markApplied: {
		operation: "markApplied",
		from: ["applying"],
		to: "applied",
		authority: "apply_orchestrator",
		requiredPermission: null,
		reasonRequired: false,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.change_request.applied",
		auditAction: "change_request.applied",
		reversible: false,
	},
	markFailed: {
		operation: "markFailed",
		from: ["applying"],
		to: "failed",
		authority: "apply_orchestrator",
		requiredPermission: null,
		reasonRequired: true,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.change_request.failed",
		auditAction: "change_request.failed",
		reversible: false,
	},
	cancel: {
		operation: "cancel",
		from: ["draft", "submitted", "approved"],
		to: "cancelled",
		authority: "actor",
		requiredPermission: "master_data.change_request_cancel",
		reasonRequired: true,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.change_request.cancelled",
		auditAction: "change_request.cancel",
		reversible: false,
	},
	expire: {
		operation: "expire",
		from: ["submitted", "approved"],
		to: "expired",
		authority: "system",
		requiredPermission: null,
		reasonRequired: false,
		expectedWorkflowVersionRequired: true,
		eventType: "master_data.change_request.expired",
		auditAction: "change_request.expire",
		reversible: false,
	},
} as const satisfies Record<string, ChangeRequestTransitionDefinition>;

export type ChangeRequestTransitionName =
	keyof typeof CHANGE_REQUEST_TRANSITIONS;

export function decideChangeRequestTransition(input: {
	currentStatus: ChangeRequestStatus;
	transition: ChangeRequestTransitionName;
	authority?: ChangeRequestTransitionAuthority;
	reason?: string;
}): Result<ChangeRequestTransitionDefinition> {
	const definition = CHANGE_REQUEST_TRANSITIONS[input.transition];
	const sourceStatuses: readonly ChangeRequestStatus[] = definition.from;
	if (!sourceStatuses.includes(input.currentStatus)) {
		return governanceInvalidTransition({
			operation: definition.operation,
			currentStatus: input.currentStatus,
			targetStatus: definition.to,
		});
	}
	if (
		input.authority !== undefined &&
		input.authority !== definition.authority
	) {
		return governancePolicyMismatch({
			policyId: `change_request.transition.${definition.operation}`,
			expected: { authority: definition.authority },
			actual: { authority: input.authority },
		});
	}
	if (definition.reasonRequired && !input.reason?.trim()) {
		return governanceReasonRequired({
			operation: definition.operation,
			requiredReason: "decision_reason",
		});
	}
	return ok(definition);
}
