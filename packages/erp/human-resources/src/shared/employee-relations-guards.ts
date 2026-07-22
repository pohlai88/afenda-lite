import { fail, type Result } from "@afenda/errors/result";

import { HUMAN_RESOURCES_ERROR_CONFLICT } from "../error-codes";
import { conflict, invalidState } from "./domain-guards";
import type {
	EmployeeCaseActionType,
	EmployeeCaseStatus,
} from "./employee-relations-status";

export function assertEmployeeCaseMutable(
	status: EmployeeCaseStatus,
): Result<void> {
	if (status === "closed") {
		return invalidState("Case is closed");
	}
	return { ok: true, data: undefined };
}

export function assertEmployeeCaseOwnerNotConflicted(input: {
	ownerActorUserId: string;
	conflictedActorUserIds: readonly string[];
	subjectActorUserId: string | null;
}): Result<void> {
	if (input.conflictedActorUserIds.includes(input.ownerActorUserId)) {
		return conflict("Case owner has a conflict of interest");
	}
	if (
		input.subjectActorUserId !== null &&
		input.ownerActorUserId === input.subjectActorUserId
	) {
		return conflict("Case owner cannot be the subject employee");
	}
	return { ok: true, data: undefined };
}

export function assertPolicyValidationForAction(input: {
	actionType: EmployeeCaseActionType;
	policyValidationRecorded: boolean;
}): Result<void> {
	if (
		(input.actionType === "termination_recommendation" ||
			input.actionType === "suspension_recommendation") &&
		!input.policyValidationRecorded
	) {
		return fail("BAD_REQUEST", "Policy validation is required for this action", {
			humanResourcesCode: "human_resources.invalid_input",
		});
	}
	return { ok: true, data: undefined };
}

export function assertInterimMeasureDates(input: {
	startsOn: string;
	reviewOn: string;
}): Result<void> {
	if (input.reviewOn < input.startsOn) {
		return fail("BAD_REQUEST", "Interim review date must be on or after start date", {
			humanResourcesCode: "human_resources.invalid_input",
		});
	}
	return { ok: true, data: undefined };
}

export function assertEmployeeCaseStatusAllowsFinding(
	status: EmployeeCaseStatus,
): Result<void> {
	if (status !== "open" && status !== "investigating") {
		return invalidState("Finding cannot be recorded in the current case status");
	}
	return { ok: true, data: undefined };
}

export function assertEmployeeCaseStatusAllowsActionRecommend(
	status: EmployeeCaseStatus,
): Result<void> {
	if (status !== "finding_recorded" && status !== "action_pending") {
		return invalidState("Action cannot be recommended in the current case status");
	}
	return { ok: true, data: undefined };
}

export function assertEmployeeCaseStatusAllowsAppeal(
	status: EmployeeCaseStatus,
): Result<void> {
	if (status !== "action_approved" && status !== "under_appeal") {
		return invalidState("Appeal cannot be recorded in the current case status");
	}
	return { ok: true, data: undefined };
}

export { HUMAN_RESOURCES_ERROR_CONFLICT };
