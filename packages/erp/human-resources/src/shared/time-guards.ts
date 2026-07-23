import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	humanResourcesErrorDetails,
} from "../error-codes";
import type {
	AttendanceException,
	OvertimeRequestStatus,
	ShiftAssignmentPublicationStatus,
	ShiftStatus,
	TimesheetStatus,
} from "../types";
import { invalidState } from "./domain-guards";

const SHIFT_STATUS: Record<ShiftStatus, readonly ShiftStatus[]> = {
	draft: ["active", "inactive"],
	active: ["superseded", "inactive"],
	superseded: [],
	inactive: ["active"],
};

const ASSIGNMENT_STATUS: Record<
	ShiftAssignmentPublicationStatus,
	readonly ShiftAssignmentPublicationStatus[]
> = {
	planned: ["published", "cancelled", "changed"],
	published: ["changed", "cancelled", "completed"],
	changed: ["published", "cancelled", "completed"],
	cancelled: [],
	completed: [],
};

const TIMESHEET_STATUS: Record<TimesheetStatus, readonly TimesheetStatus[]> = {
	draft: ["submitted"],
	submitted: ["returned", "approved", "rejected"],
	returned: ["submitted", "draft"],
	approved: ["locked", "superseded"],
	rejected: ["superseded"],
	locked: [],
	superseded: [],
};

const OVERTIME_STATUS: Record<
	OvertimeRequestStatus,
	readonly OvertimeRequestStatus[]
> = {
	requested: ["approved", "rejected", "cancelled"],
	approved: ["worked", "cancelled"],
	rejected: [],
	worked: ["verified"],
	verified: [],
	cancelled: [],
};

const EXCEPTION_STATUS: Record<
	AttendanceException["reviewStatus"],
	readonly AttendanceException["reviewStatus"][]
> = {
	open: ["in_review", "excused", "rejected", "resolved"],
	in_review: ["excused", "rejected", "resolved"],
	excused: [],
	rejected: [],
	resolved: [],
};

function assertTransition<T extends string>(
	current: T,
	next: T,
	table: Record<T, readonly T[]>,
	label: string,
): Result<void> {
	if (current === next) return ok(undefined);
	const allowed = table[current] ?? [];
	if (!allowed.includes(next)) {
		return invalidState(
			`Cannot transition ${label} from ${current} to ${next}`,
		);
	}
	return ok(undefined);
}

export function assertShiftStatusTransition(
	current: ShiftStatus,
	next: ShiftStatus,
): Result<void> {
	return assertTransition(current, next, SHIFT_STATUS, "shift");
}

export function assertAssignmentStatusTransition(
	current: ShiftAssignmentPublicationStatus,
	next: ShiftAssignmentPublicationStatus,
): Result<void> {
	return assertTransition(current, next, ASSIGNMENT_STATUS, "shift assignment");
}

export function assertTimesheetStatusTransition(
	current: TimesheetStatus,
	next: TimesheetStatus,
): Result<void> {
	if (current === next && (current === "locked" || current === "superseded")) {
		return invalidState(
			`Cannot transition timesheet from ${current} to ${next}`,
		);
	}
	return assertTransition(current, next, TIMESHEET_STATUS, "timesheet");
}

export function assertOvertimeStatusTransition(
	current: OvertimeRequestStatus,
	next: OvertimeRequestStatus,
): Result<void> {
	return assertTransition(current, next, OVERTIME_STATUS, "overtime request");
}

export function assertExceptionStatusTransition(
	current: AttendanceException["reviewStatus"],
	next: AttendanceException["reviewStatus"],
): Result<void> {
	return assertTransition(
		current,
		next,
		EXCEPTION_STATUS,
		"attendance exception",
	);
}

export function assertNoSelfApprove(input: {
	actorUserId: string;
	subjectUserId?: string | null;
	createdBy: string;
}): Result<void> {
	const subject = input.subjectUserId ?? input.createdBy;
	if (input.actorUserId === subject) {
		return fail(
			"FORBIDDEN",
			"Actor cannot approve their own time record",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
		);
	}
	return ok(undefined);
}

export function computeIsOvernight(
	startLocal: string,
	endLocal: string,
): boolean {
	return endLocal <= startLocal;
}

export function localTimeToMinutes(value: string): number {
	const [h, m] = value.split(":").map(Number);
	return (h ?? 0) * 60 + (m ?? 0);
}

export function computeExpectedMinutes(
	startLocal: string,
	endLocal: string,
	isOvernight: boolean,
): number {
	const start = localTimeToMinutes(startLocal);
	const end = localTimeToMinutes(endLocal);
	if (isOvernight) return 24 * 60 - start + end;
	return Math.max(0, end - start);
}
