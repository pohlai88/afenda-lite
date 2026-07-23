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

			return ok({
				employmentId: query.employmentId,
				employeeId: query.employeeId,
				departmentId: null,
				locationKey: employmentCalendar.data?.locationCode ?? null,
				legalEntityKey: null,
			});
		},
	};
}
