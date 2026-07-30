import { ok, type Result } from "@afenda/errors/result";

import type {
	HumanResourcesAssignmentId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentMovementId,
	HumanResourcesWorkCalendarId,
} from "../brands";
import {
	parseHumanResourcesAssignmentId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentMovementId,
	parseHumanResourcesWorkCalendarId,
} from "../brands";
import type { WorkAssignment } from "../types";

interface AssignmentLineageRow {
	manager_employee_id_snapshot?: string | null | undefined;
	managerEmployeeIdSnapshot?: string | null | undefined;
	predecessor_assignment_id?: string | null | undefined;
	predecessorAssignmentId?: string | null | undefined;
	successor_assignment_id?: string | null | undefined;
	successorAssignmentId?: string | null | undefined;
	transfer_movement_id?: string | null | undefined;
	transferMovementId?: string | null | undefined;
	work_calendar_id_snapshot?: string | null | undefined;
	workCalendarIdSnapshot?: string | null | undefined;
}

function readOptionalString(
	row: AssignmentLineageRow,
	camel: keyof AssignmentLineageRow,
	snake: keyof AssignmentLineageRow,
): string | null {
	const value = row[camel] ?? row[snake];
	return value ?? null;
}

export function mapAssignmentLineageFields(row: AssignmentLineageRow): Result<{
	predecessorAssignmentId: HumanResourcesAssignmentId | null;
	successorAssignmentId: HumanResourcesAssignmentId | null;
	transferMovementId: HumanResourcesEmploymentMovementId | null;
	managerEmployeeIdSnapshot: HumanResourcesEmployeeId | null;
	workCalendarIdSnapshot: HumanResourcesWorkCalendarId | null;
}> {
	const predecessorRaw = readOptionalString(
		row,
		"predecessorAssignmentId",
		"predecessor_assignment_id",
	);
	const successorRaw = readOptionalString(
		row,
		"successorAssignmentId",
		"successor_assignment_id",
	);
	const movementRaw = readOptionalString(
		row,
		"transferMovementId",
		"transfer_movement_id",
	);
	const managerRaw = readOptionalString(
		row,
		"managerEmployeeIdSnapshot",
		"manager_employee_id_snapshot",
	);
	const calendarRaw = readOptionalString(
		row,
		"workCalendarIdSnapshot",
		"work_calendar_id_snapshot",
	);

	let predecessorAssignmentId: HumanResourcesAssignmentId | null = null;
	if (predecessorRaw !== null) {
		const parsed = parseHumanResourcesAssignmentId(predecessorRaw);
		if (!parsed.ok) {
			return parsed;
		}
		predecessorAssignmentId = parsed.data;
	}

	let successorAssignmentId: HumanResourcesAssignmentId | null = null;
	if (successorRaw !== null) {
		const parsed = parseHumanResourcesAssignmentId(successorRaw);
		if (!parsed.ok) {
			return parsed;
		}
		successorAssignmentId = parsed.data;
	}

	let transferMovementId: HumanResourcesEmploymentMovementId | null = null;
	if (movementRaw !== null) {
		const parsed = parseHumanResourcesEmploymentMovementId(movementRaw);
		if (!parsed.ok) {
			return parsed;
		}
		transferMovementId = parsed.data;
	}

	let managerEmployeeIdSnapshot: HumanResourcesEmployeeId | null = null;
	if (managerRaw !== null) {
		const parsed = parseHumanResourcesEmployeeId(managerRaw);
		if (!parsed.ok) {
			return parsed;
		}
		managerEmployeeIdSnapshot = parsed.data;
	}

	let workCalendarIdSnapshot: HumanResourcesWorkCalendarId | null = null;
	if (calendarRaw !== null) {
		const parsed = parseHumanResourcesWorkCalendarId(calendarRaw);
		if (!parsed.ok) {
			return parsed;
		}
		workCalendarIdSnapshot = parsed.data;
	}

	return ok({
		predecessorAssignmentId,
		successorAssignmentId,
		transferMovementId,
		managerEmployeeIdSnapshot,
		workCalendarIdSnapshot,
	});
}

export function withDefaultAssignmentLineage(
	assignment: Omit<
		WorkAssignment,
		| "predecessorAssignmentId"
		| "successorAssignmentId"
		| "transferMovementId"
		| "managerEmployeeIdSnapshot"
		| "workCalendarIdSnapshot"
	> &
		Partial<
			Pick<
				WorkAssignment,
				| "predecessorAssignmentId"
				| "successorAssignmentId"
				| "transferMovementId"
				| "managerEmployeeIdSnapshot"
				| "workCalendarIdSnapshot"
			>
		>,
): WorkAssignment {
	return {
		...assignment,
		predecessorAssignmentId: assignment.predecessorAssignmentId ?? null,
		successorAssignmentId: assignment.successorAssignmentId ?? null,
		transferMovementId: assignment.transferMovementId ?? null,
		managerEmployeeIdSnapshot: assignment.managerEmployeeIdSnapshot ?? null,
		workCalendarIdSnapshot: assignment.workCalendarIdSnapshot ?? null,
	};
}
