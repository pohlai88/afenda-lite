import type { HumanResourcesCommandOptions } from "../../command-options";
import {
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
} from "../../permissions";
import {
	actorHoldsAnyPermission,
	allowAuthorization,
	decisionFromProjection,
	denyAuthorization,
	isInManagerScope,
	isPrivilegedActor,
	isSubjectEmployee,
} from "../authorization-policy-helpers";
import type { HumanResourcesAuthorizationPolicy } from "../authorization-policy-types";
import type { HumanResourcesAuthorizationRequest } from "../authorization-types";
import {
	type CompensationFieldAccessTier,
	partitionCompensationFieldsByTier,
} from "../field-projection";

function isPayrollHandoffOperation(operationId: string): boolean {
	return operationId.startsWith(
		"human-resources.approved-compensation-handoff.",
	);
}

async function resolveCompensationTier(
	request: HumanResourcesAuthorizationRequest,
	options: HumanResourcesCommandOptions,
): Promise<CompensationFieldAccessTier | null> {
	const resource = request.resource;
	if (resource === undefined) {
		return null;
	}
	const isHandoff = isPayrollHandoffOperation(request.operationId);
	const isCompensationAdmin =
		isPrivilegedActor(resource) ||
		(await actorHoldsAnyPermission(request, options, [
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
		]));
	if (isCompensationAdmin) {
		return isHandoff ? "payroll" : "confidential";
	}
	// Managers never receive payroll handoff tiers.
	if (isHandoff) {
		if (
			isSubjectEmployee(request.actor, resource) &&
			(await actorHoldsAnyPermission(request, options, [
				HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
			]))
		) {
			return "payroll";
		}
		return null;
	}
	if (isInManagerScope(request.actor, resource)) {
		return "manager";
	}
	if (
		isSubjectEmployee(request.actor, resource) &&
		(await actorHoldsAnyPermission(request, options, [
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
		]))
	) {
		return "confidential";
	}
	return null;
}

export const compensationPolicy: HumanResourcesAuthorizationPolicy = {
	id: "hr.compensation",
	mode: "specialized",
	resourceRequired: true,
	operationPrefixes: [
		"human-resources.compensation-grade.",
		"human-resources.salary-band.",
		"human-resources.employee-compensation.",
		"human-resources.compensation-review.",
		"human-resources.compensation-proposal.",
		"human-resources.benefit-plan.",
		"human-resources.benefit-enrollment.",
		"human-resources.approved-compensation-handoff.",
	],
	async evaluate(
		request: HumanResourcesAuthorizationRequest,
		options: HumanResourcesCommandOptions,
	) {
		const resource = request.resource;
		if (resource === undefined) {
			return denyAuthorization(
				"resource_context_required",
				"Resource context is required for policy hr.compensation",
				"hr.compensation",
			);
		}

		const tier = await resolveCompensationTier(request, options);
		if (tier === null) {
			return denyAuthorization(
				"subject_scope_denied",
				isPayrollHandoffOperation(request.operationId)
					? "Managers cannot access payroll handoff data"
					: "Actor is outside the allowed compensation scope",
				"hr.compensation",
			);
		}

		if (
			request.operationKind === "command" ||
			request.requestedFields === undefined ||
			request.requestedFields.length === 0
		) {
			return allowAuthorization("hr.compensation");
		}

		return decisionFromProjection({
			policyId: "hr.compensation",
			projection: partitionCompensationFieldsByTier({
				requestedFields: request.requestedFields,
				tier,
			}),
			denyReason:
				"Actor cannot access any of the requested compensation fields",
		});
	},
};
