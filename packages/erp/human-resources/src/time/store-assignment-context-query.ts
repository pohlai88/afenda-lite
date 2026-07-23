import { ok, type Result } from "@afenda/errors/result";

import {
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentId,
} from "../brands";
import type { HumanResourcesStore } from "../store";
import type {
	AssignmentContextQueryPort,
	EmployeeAssignmentContext,
} from "./handoff/ports";

export function createStoreAssignmentContextQuery(input: {
	store: HumanResourcesStore;
}): AssignmentContextQueryPort {
	const { store } = input;

	return {
		async resolveAsOf(query): Promise<Result<EmployeeAssignmentContext>> {
			const employeeId = parseHumanResourcesEmployeeId(query.employeeId);
			if (!employeeId.ok) return employeeId;
			const employmentId = parseHumanResourcesEmploymentId(query.employmentId);
			if (!employmentId.ok) return employmentId;

			const employmentCalendar = await store.resolveEmploymentCalendar({
				organizationId: query.organizationId,
				employeeId: employeeId.data,
				employmentId: employmentId.data,
				asOf: query.asOf,
			});
			if (!employmentCalendar.ok) {
				return employmentCalendar;
			}

			let departmentId: string | null = null;
			const openAssignment = await store.findOpenAssignmentByEmployment({
				organizationId: query.organizationId,
				employmentId: employmentId.data,
			});
			if (!openAssignment.ok) {
				return openAssignment;
			}
			if (openAssignment.data !== null) {
				const position = await store.getPositionById({
					organizationId: query.organizationId,
					positionId: openAssignment.data.positionId,
				});
				if (!position.ok) {
					return position;
				}
				departmentId = position.data?.departmentId ?? null;
			}

			return ok({
				employmentId: query.employmentId,
				employeeId: query.employeeId,
				departmentId,
				locationKey: employmentCalendar.data?.locationCode ?? null,
				legalEntityKey: employmentCalendar.data?.jurisdiction ?? null,
			});
		},
	};
}
