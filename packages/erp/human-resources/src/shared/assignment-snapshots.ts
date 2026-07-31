import { errorResult, type Result } from "@afenda/errors";

import type {
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
	HumanResourcesPositionId,
	HumanResourcesWorkCalendarId,
} from "../brands";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import type { HumanResourcesOrganizationDimensions } from "../ports";
import type { HumanResourcesStore } from "../store";
import { resolveEmployeeWorkCalendar } from "../time/employee-work-calendar-resolution";
import type { AssignmentContextQueryPort } from "../time/handoff/ports";

type AssignmentSnapshotStore = Pick<
	HumanResourcesStore,
	"resolvePrimaryManager" | "getPositionById"
>;

export async function resolveAssignmentContextSnapshots(input: {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	positionId: HumanResourcesPositionId;
	organizationDimensions: HumanResourcesOrganizationDimensions;
	asOf: string;
	store: AssignmentSnapshotStore;
	calendarStore: Parameters<typeof resolveEmployeeWorkCalendar>[1]["store"];
}): Promise<
	Result<{
		managerEmployeeIdSnapshot: HumanResourcesEmployeeId | null;
		workCalendarIdSnapshot: HumanResourcesWorkCalendarId | null;
		departmentId: string | null;
	}>
> {
	const position = await input.store.getPositionById({
		organizationId: input.organizationId,
		positionId: input.positionId,
	});
	if (!position.ok) {
		return position;
	}
	const departmentId = position.data?.departmentId ?? null;

	const manager = await input.store.resolvePrimaryManager({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
		asOf: input.asOf,
	});
	if (!manager.ok) {
		return manager;
	}

	const assignmentContext: AssignmentContextQueryPort = {
		async resolveAsOf() {
			return await errorResult.ok({
				employmentId: input.employmentId,
				employeeId: input.employeeId,
				departmentId,
				locationKey: input.organizationDimensions.location.key,
				legalEntityKey: input.organizationDimensions.legal_entity.key,
			});
		},
	};

	const calendar = await resolveEmployeeWorkCalendar(
		{
			organizationId: input.organizationId,
			employeeId: input.employeeId,
			employmentId: input.employmentId,
			asOf: input.asOf,
		},
		{
			store: input.calendarStore,
			assignmentContext,
		},
	);
	if (!calendar.ok) {
		if (calendar.code === "NOT_FOUND") {
			return errorResult.ok({
				managerEmployeeIdSnapshot: manager.data?.managerEmployeeId ?? null,
				workCalendarIdSnapshot: null,
				departmentId,
			});
		}
		if (calendar.code === "CONFLICT") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "The request conflicts with current state",
				internalContext: humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_CONFLICT,
				),
			});
		}
		return calendar;
	}

	return errorResult.ok({
		managerEmployeeIdSnapshot: manager.data?.managerEmployeeId ?? null,
		workCalendarIdSnapshot: calendar.data.calendarId,
		departmentId,
	});
}
