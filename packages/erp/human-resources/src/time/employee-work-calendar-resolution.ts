import { fail, ok, type Result } from "@afenda/errors/result";

import {
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentId,
	type HumanResourcesWorkCalendarId,
} from "../brands";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	type ScopedCalendarAssignmentCandidate,
	selectScopedWorkCalendarAssignment,
} from "../shared/calendar-scope-resolution";
import type { HumanResourcesStore } from "../store";
import type {
	WorkCalendarScopeAssignment,
	WorkCalendarScopeType,
} from "../types";
import type { AssignmentContextQueryPort } from "./handoff/ports";

type EmployeeWorkCalendarStoreSlice = Pick<
	HumanResourcesStore,
	| "listWorkCalendarScopeAssignments"
	| "resolveEmploymentCalendar"
	| "getWorkCalendar"
>;

function isEffectiveOn(
	assignment: { effectiveFrom: string; effectiveTo: string | null },
	asOf: string,
): boolean {
	if (asOf < assignment.effectiveFrom) {
		return false;
	}
	if (assignment.effectiveTo !== null && asOf > assignment.effectiveTo) {
		return false;
	}
	return true;
}

function scopeCandidate(
	assignment: WorkCalendarScopeAssignment,
): ScopedCalendarAssignmentCandidate {
	return {
		scopeType: assignment.scopeType,
		scopeKey: assignment.scopeKey,
		calendarId: assignment.calendarId,
		effectiveFrom: assignment.effectiveFrom,
		effectiveTo: assignment.effectiveTo,
	};
}

function matchesScopeKey(
	assignment: WorkCalendarScopeAssignment,
	keys: {
		employmentId: string;
		employeeId: string;
		locationKey: string | null;
		departmentId: string | null;
		legalEntityKey: string | null;
		organizationKey: string;
	},
): boolean {
	switch (assignment.scopeType as WorkCalendarScopeType) {
		case "employment":
			return assignment.scopeKey === keys.employmentId;
		case "employee":
			return assignment.scopeKey === keys.employeeId;
		case "location":
			return keys.locationKey !== null && assignment.scopeKey === keys.locationKey;
		case "department":
			return keys.departmentId !== null && assignment.scopeKey === keys.departmentId;
		case "legal_entity":
			return (
				keys.legalEntityKey !== null && assignment.scopeKey === keys.legalEntityKey
			);
		case "organization":
			return assignment.scopeKey === keys.organizationKey;
		default:
			return false;
	}
}

export async function resolveEmployeeWorkCalendar(
	input: {
		organizationId: string;
		employeeId: string;
		employmentId: string;
		asOf: string;
	},
	deps: {
		store: EmployeeWorkCalendarStoreSlice;
		assignmentContext: AssignmentContextQueryPort;
	},
): Promise<Result<{ calendarId: HumanResourcesWorkCalendarId }>> {
	const context = await deps.assignmentContext.resolveAsOf({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
		employmentId: input.employmentId,
		asOf: input.asOf,
	});
	if (!context.ok) {
		return context;
	}

	const scopeKeys = {
		employmentId: input.employmentId,
		employeeId: input.employeeId,
		locationKey: context.data.locationKey,
		departmentId: context.data.departmentId,
		legalEntityKey: context.data.legalEntityKey,
		organizationKey: input.organizationId,
	};

	const scoped = await deps.store.listWorkCalendarScopeAssignments({
		organizationId: input.organizationId,
		asOf: input.asOf,
	});
	if (!scoped.ok) {
		return scoped;
	}

	const candidates: ScopedCalendarAssignmentCandidate[] = scoped.data
		.filter(
			(assignment) =>
				isEffectiveOn(assignment, input.asOf) &&
				matchesScopeKey(assignment, scopeKeys),
		)
		.map(scopeCandidate);

	const employeeId = parseHumanResourcesEmployeeId(input.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	const employmentId = parseHumanResourcesEmploymentId(input.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}

	const employmentAssignment = await deps.store.resolveEmploymentCalendar({
		organizationId: input.organizationId,
		employeeId: employeeId.data,
		employmentId: employmentId.data,
		asOf: input.asOf,
	});
	if (!employmentAssignment.ok) {
		return employmentAssignment;
	}
	if (employmentAssignment.data !== null) {
		candidates.push({
			scopeType: "employment",
			scopeKey: input.employmentId,
			calendarId: employmentAssignment.data.calendarId,
			effectiveFrom: employmentAssignment.data.effectiveFrom,
			effectiveTo: employmentAssignment.data.effectiveTo,
		});
	}

	const selected = selectScopedWorkCalendarAssignment({
		asOf: input.asOf,
		candidates,
	});
	if (selected === null) {
		return fail(
			"NOT_FOUND",
			"No active work calendar is assigned for this employment.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
		);
	}
	if ("conflict" in selected) {
		return fail(
			"CONFLICT",
			"Multiple scoped work calendar assignments tie at the same precedence level.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
		);
	}

	const calendar = await deps.store.getWorkCalendar({
		organizationId: input.organizationId,
		calendarId: selected.calendarId as HumanResourcesWorkCalendarId,
	});
	if (!calendar.ok) {
		return calendar;
	}
	if (calendar.data === null || calendar.data.status !== "active") {
		return fail(
			"NOT_FOUND",
			"Work calendar not found.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
		);
	}

	return ok({ calendarId: calendar.data.id });
}
