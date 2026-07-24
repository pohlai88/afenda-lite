import { fail, ok, type Result } from "@afenda/errors/result";

import {
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentId,
} from "../brands";
import {
	HUMAN_RESOURCES_ERROR_NO_DETERMINISTIC_ASSIGNMENT,
	humanResourcesErrorDetails,
} from "../error-codes";
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

			const assignment = await store.findAssignmentByEmploymentAsOf({
				organizationId: query.organizationId,
				employmentId: employmentId.data,
				asOf: query.asOf,
			});
			if (!assignment.ok) {
				return assignment;
			}
			if (
				assignment.data === null ||
				assignment.data.organizationDimensions === null
			) {
				return fail(
					assignment.data === null ? "NOT_FOUND" : "CONFLICT",
					"Assignment has no deterministic organization context",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NO_DETERMINISTIC_ASSIGNMENT,
					),
				);
			}
			const position = await store.getPositionById({
				organizationId: query.organizationId,
				positionId: assignment.data.positionId,
			});
			if (!position.ok) {
				return position;
			}

			return ok({
				employmentId: query.employmentId,
				employeeId: query.employeeId,
				departmentId: position.data?.departmentId ?? null,
				locationKey: assignment.data.organizationDimensions.location.key,
				legalEntityKey: assignment.data.organizationDimensions.legal_entity.key,
			});
		},
	};
}
