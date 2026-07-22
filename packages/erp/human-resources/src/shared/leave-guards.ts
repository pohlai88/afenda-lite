import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesEmployeeId } from "../brands";
import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	humanResourcesErrorDetails,
} from "../error-codes";
import { invalidInput, invalidState } from "./domain-guards";
import type { EmploymentStatus } from "./employment-status";
import { compareLeaveQuantity } from "./leave-balance";
import type {
	ApprovalDecision,
	LeavePolicyStatus,
	LeaveRequestStatus,
} from "./leave-status";
import {
	canTransitionLeaveEntitlementStatus,
	canTransitionLeavePolicyStatus,
	canTransitionLeaveRequestStatus,
	isLeaveEntitlementActive,
	isLeavePolicyEditable,
	isLeavePolicyPublished,
} from "./leave-status";

function cannotTransition(
	entity: string,
	current: string,
	next: string,
): Result<never> {
	return fail(
		"BAD_REQUEST",
		`Cannot transition ${entity} from '${current}' to '${next}'`,
		humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION),
	);
}

export function assertLeavePolicyStatusTransition(
	current: LeavePolicyStatus,
	next: LeavePolicyStatus,
): Result<void> {
	if (!canTransitionLeavePolicyStatus(current, next)) {
		return cannotTransition("leave policy", current, next);
	}
	return ok(undefined);
}

export function assertLeaveRequestStatusTransition(
	current: LeaveRequestStatus,
	next: LeaveRequestStatus,
): Result<void> {
	if (!canTransitionLeaveRequestStatus(current, next)) {
		return cannotTransition("leave request", current, next);
	}
	return ok(undefined);
}

export function assertLeaveEntitlementStatusTransition(
	current: Parameters<typeof canTransitionLeaveEntitlementStatus>[0],
	next: Parameters<typeof canTransitionLeaveEntitlementStatus>[1],
): Result<void> {
	if (!canTransitionLeaveEntitlementStatus(current, next)) {
		return cannotTransition("leave entitlement", current, next);
	}
	return ok(undefined);
}

export function assertLeavePolicyEditable(
	status: LeavePolicyStatus,
): Result<void> {
	if (!isLeavePolicyEditable(status)) {
		return invalidState("Leave policy must be in draft status");
	}
	return ok(undefined);
}

export function assertLeavePolicyPublished(
	status: LeavePolicyStatus,
): Result<void> {
	if (!isLeavePolicyPublished(status)) {
		return invalidState("Leave policy must be published");
	}
	return ok(undefined);
}

export function assertLeaveEntitlementActive(
	status: Parameters<typeof isLeaveEntitlementActive>[0],
): Result<void> {
	if (!isLeaveEntitlementActive(status)) {
		return invalidState("Leave entitlement must be active");
	}
	return ok(undefined);
}

export function assertEmploymentActiveForLeave(input: {
	employmentStatus: EmploymentStatus;
	endsOn: string | null;
	asOfDate: string;
}): Result<void> {
	if (input.employmentStatus === "terminated") {
		return invalidState("Employment is terminated");
	}
	if (input.endsOn !== null && input.endsOn < input.asOfDate) {
		return invalidState("Employment has ended");
	}
	return ok(undefined);
}

export function assertNoSelfApproval(input: {
	employeeUserId: string;
	approverUserId: string;
	allowSelfApproval: boolean;
}): Result<void> {
	if (
		!input.allowSelfApproval &&
		input.employeeUserId === input.approverUserId
	) {
		return fail(
			"FORBIDDEN",
			"Self-approval is not allowed for this leave policy",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok(undefined);
}

export function assertSufficientLeaveBalance(input: {
	balance: string;
	requestedQuantity: string;
	allowsNegativeBalance: boolean;
}): Result<void> {
	if (input.allowsNegativeBalance) {
		return ok(undefined);
	}
	if (compareLeaveQuantity(input.balance, input.requestedQuantity) < 0) {
		return invalidInput("Insufficient leave balance");
	}
	return ok(undefined);
}

export type LeaveOverlapSegment = {
	segmentDate: string;
	dayPortion: "morning" | "afternoon" | "full";
};

export function segmentsOverlap(
	left: LeaveOverlapSegment,
	right: LeaveOverlapSegment,
): boolean {
	if (left.segmentDate !== right.segmentDate) {
		return false;
	}
	if (left.dayPortion === "full" || right.dayPortion === "full") {
		return true;
	}
	return left.dayPortion === right.dayPortion;
}

export function assertNoLeaveOverlap(
	candidate: LeaveOverlapSegment[],
	existing: LeaveOverlapSegment[],
): Result<void> {
	for (const candidateSegment of candidate) {
		for (const existingSegment of existing) {
			if (segmentsOverlap(candidateSegment, existingSegment)) {
				return invalidInput("Leave request overlaps an existing booking");
			}
		}
	}
	return ok(undefined);
}

export function assertApprovalDecisionMatchesRequestTransition(input: {
	decision: ApprovalDecision;
	nextStatus: LeaveRequestStatus;
}): Result<void> {
	const expected: Record<ApprovalDecision, LeaveRequestStatus> = {
		approved: "approved",
		rejected: "rejected",
		returned: "returned",
		cancelled: "cancelled",
	};
	if (expected[input.decision] !== input.nextStatus) {
		return invalidInput("Approval decision does not match request transition");
	}
	return ok(undefined);
}

export function assertApproverIsPrimaryManager(input: {
	approverEmployeeId: HumanResourcesEmployeeId;
	primaryManagerEmployeeId: HumanResourcesEmployeeId | null;
}): Result<void> {
	if (input.primaryManagerEmployeeId === null) {
		return fail(
			"FORBIDDEN",
			"No primary manager is assigned for this employee",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	if (input.approverEmployeeId !== input.primaryManagerEmployeeId) {
		return fail(
			"FORBIDDEN",
			"Approver is not the employee's primary manager",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok(undefined);
}

export function assertLeaveRequestAmendable(
	status: LeaveRequestStatus,
): Result<void> {
	if (status !== "draft" && status !== "returned") {
		return invalidState("Leave request must be in draft or returned status");
	}
	return ok(undefined);
}
