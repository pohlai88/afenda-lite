import { errorResult, type Result } from "@afenda/errors";
import {
	HUMAN_RESOURCES_ERROR_NO_DETERMINISTIC_ASSIGNMENT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../../kernel/execution/error-codes";
import type {
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
} from "../../../kernel/identity/brands";
import type { EmployeeOrgContextAsOf } from "../../../kernel/validation/org-context";
import type { HumanResourcesOrganizationStore } from "../../organization/store";
import type { HumanResourcesCoreStore } from "./store-contract";

export type EmployeeOrgContextResolutionStore = Pick<
	HumanResourcesCoreStore,
	"findAssignmentByEmploymentAsOf"
> &
	Pick<HumanResourcesOrganizationStore, "findPositionAsOf">;

export type ResolveEmployeeOrgContextMode = "strict" | "soft";

/**
 * Resolve org context for a known employment segment.
 * Strict mode fails when assignment/dimensions are missing; soft mode returns null.
 */
export async function resolveEmployeeOrgContextForEmployment(input: {
	store: EmployeeOrgContextResolutionStore;
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
			? errorResult.ok(null)
			: errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
	}

	const dimensions = assignment.data.organizationDimensions;
	if (dimensions === null) {
		return input.mode === "soft"
			? errorResult.ok(null)
			: errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NO_DETERMINISTIC_ASSIGNMENT,
					),
				});
	}

	const position = await input.store.findPositionAsOf({
		organizationId: input.organizationId,
		positionId: assignment.data.positionId,
		asOf: input.asOf,
	});
	if (!position.ok) {
		return position;
	}

	return errorResult.ok({
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
