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

/**
 * Store-backed assignment context for calendar / time resolution.
 *
 * Missing work assignments (or missing dimension snapshots) resolve to null
 * location / legal-entity / department keys so organization- and employee-scoped
 * calendars can still be selected. Callers that require a deterministic position
 * assignment must enforce that in their own command path (e.g. org-context).
 */
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

			const assignment = await store.findAssignmentByEmploymentAsOf({
				organizationId: query.organizationId,
				employmentId: employmentId.data,
				asOf: query.asOf,
			});
			if (!assignment.ok) {
				return assignment;
			}

			if (assignment.data === null) {
				return ok({
					employmentId: query.employmentId,
					employeeId: query.employeeId,
					departmentId: null,
					locationKey: null,
					legalEntityKey: null,
				});
			}

			const position = await store.getPositionById({
				organizationId: query.organizationId,
				positionId: assignment.data.positionId,
			});
			if (!position.ok) {
				return position;
			}

			const dimensions = assignment.data.organizationDimensions;
			return ok({
				employmentId: query.employmentId,
				employeeId: query.employeeId,
				departmentId: position.data?.departmentId ?? null,
				locationKey: dimensions?.location.key ?? null,
				legalEntityKey: dimensions?.legal_entity.key ?? null,
			});
		},
	};
}
