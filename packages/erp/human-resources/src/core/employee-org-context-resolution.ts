import { fail, ok, type Result } from "@afenda/errors/result";

import type {
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
} from "../brands";
import {
	HUMAN_RESOURCES_ERROR_NO_DETERMINISTIC_ASSIGNMENT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import type { EmployeeOrgContextAsOf } from "../schemas/org-context";
import type { HumanResourcesStore } from "../store";

export type ResolveEmployeeOrgContextMode = "strict" | "soft";

/**
 * Resolve org context for a known employment segment.
 * Strict mode fails when assignment/dimensions are missing; soft mode returns null.
 */
export async function resolveEmployeeOrgContextForEmployment(input: {
	store: HumanResourcesStore;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	asOf: string;
	mode: ResolveEmployeeOrgContextMode;
}): Promise<Result<EmployeeOrgContextAsOf | null>> {
	const assignment = await input.store.findAssignmentByEmploymentAsOf({
		organizationId: input.organizationId,
		employmentId: input.employmentId,
		asOf: input.asOf,
	});
	if (!assignment.ok) {
		return assignment;
	}
	if (assignment.data === null) {
		return input.mode === "soft"
			? ok(null)
			: fail(
					"NOT_FOUND",
					"No assignment effective on the requested date",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
	}

	const dimensions = assignment.data.organizationDimensions;
	if (dimensions === null) {
		return input.mode === "soft"
			? ok(null)
			: fail(
					"CONFLICT",
					"Assignment has no deterministic organization dimension snapshot",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NO_DETERMINISTIC_ASSIGNMENT,
					),
				);
	}

	const position = await input.store.findPositionAsOf({
		organizationId: input.organizationId,
		positionId: assignment.data.positionId,
		asOf: input.asOf,
	});
	if (!position.ok) {
		return position;
	}

	return ok({
		employmentId: input.employmentId,
		employeeId: input.employeeId,
		positionId: assignment.data.positionId,
		departmentId: position.data?.departmentId ?? null,
		managerEmployeeId: assignment.data.managerEmployeeIdSnapshot,
		locationKey: dimensions.location.key,
		legalEntityKey: dimensions.legal_entity.key,
		businessUnitKey: dimensions.business_unit.key,
		costCentreKey: dimensions.cost_centre.key,
		projectKey: dimensions.project.key,
		workCalendarId: assignment.data.workCalendarIdSnapshot,
	});
}
