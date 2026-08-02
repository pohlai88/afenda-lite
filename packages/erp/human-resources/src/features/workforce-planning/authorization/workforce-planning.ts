import {
	actorHoldsAnyPermission,
	allowAuthorization,
	decisionFromProjection,
	denyAuthorization,
	EXECUTIVE_PLANNER_ATTRIBUTE,
	isPrivilegedActor,
	requirePrivilegedAccess,
} from "../../../kernel/authorization/authorization-policy-helpers";
import type { HumanResourcesAuthorizationPolicy } from "../../../kernel/authorization/authorization-policy-types";
import type { HumanResourcesAuthorizationRequest } from "../../../kernel/authorization/authorization-types";
import {
	HUMAN_RESOURCES_PERMISSION_HEADCOUNT_EXCEPTIONAL_ADJUST,
	HUMAN_RESOURCES_PERMISSION_HEADCOUNT_RESERVE,
	HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_APPROVE,
	HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_PREPARE,
	HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_READ,
} from "../../../kernel/authorization/permissions";
import type { HumanResourcesCommandOptions } from "../../../kernel/execution/command-options";
import { partitionWorkforcePlanningReadFields } from "../../../kernel/privacy/field-projection";

const WFP_ADMIN_PERMISSIONS = [
	HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_PREPARE,
	HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_APPROVE,
	HUMAN_RESOURCES_PERMISSION_HEADCOUNT_RESERVE,
	HUMAN_RESOURCES_PERMISSION_HEADCOUNT_EXCEPTIONAL_ADJUST,
] as const;

const WFP_READ_OPERATIONS = new Set([
	"human-resources.headcount-plan.get",
	"human-resources.headcount-plan.list",
	"human-resources.headcount-plan.approved-get",
	"human-resources.headcount.availability.get",
	"human-resources.headcount-reservation.list",
	"human-resources.workforce-plan.variance.get",
]);

function isWorkforcePlanningRead(operationId: string): boolean {
	return WFP_READ_OPERATIONS.has(operationId);
}

function projectWfpRead(
	request: HumanResourcesAuthorizationRequest,
	policyId: string,
) {
	if (
		request.operationKind === "command" ||
		request.requestedFields === undefined ||
		request.requestedFields.length === 0
	) {
		return allowAuthorization(policyId);
	}
	return decisionFromProjection({
		policyId,
		projection: partitionWorkforcePlanningReadFields({
			requestedFields: request.requestedFields,
		}),
		denyReason:
			"Actor cannot access employee-level actuals through plan permissions",
	});
}

/**
 * Specialized WFP policy: admin mutations are privileged; approved-plan reads
 * allow planner/executive scope and never return employee-level actuals.
 */
export const workforcePlanningPolicy: HumanResourcesAuthorizationPolicy = {
	id: "hr.workforce-planning",
	mode: "specialized",
	resourceRequired: false,
	async evaluate(
		request: HumanResourcesAuthorizationRequest,
		options: HumanResourcesCommandOptions,
	) {
		if (isWorkforcePlanningRead(request.operationId)) {
			const { resource } = request;
			const executivePlanner =
				resource?.attributes?.[EXECUTIVE_PLANNER_ATTRIBUTE] === true;
			const canRead =
				(resource !== undefined && isPrivilegedActor(resource)) ||
				executivePlanner ||
				(await actorHoldsAnyPermission(request, options, [
					HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_READ,
					...WFP_ADMIN_PERMISSIONS,
				]));
			if (!canRead) {
				return denyAuthorization(
					"subject_scope_denied",
					"Planner or executive scope is required for workforce plan reads",
					"hr.workforce-planning",
				);
			}
			return projectWfpRead(request, "hr.workforce-planning");
		}

		const privilegedDenial = await requirePrivilegedAccess({
			request,
			policyId: "hr.workforce-planning",
			privilegedPermissions: WFP_ADMIN_PERMISSIONS,
			options,
		});
		if (privilegedDenial !== null) {
			return privilegedDenial;
		}
		return allowAuthorization("hr.workforce-planning");
	},
};
