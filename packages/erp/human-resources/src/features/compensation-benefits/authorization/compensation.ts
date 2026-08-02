import {
	actorHoldsAnyPermission,
	allowAuthorization,
	decisionFromProjection,
	denyAuthorization,
	isInManagerScope,
	isPrivilegedActor,
	isSubjectEmployee,
} from "../../../kernel/authorization/authorization-policy-helpers";
import {
	HUMAN_RESOURCES_COMPENSATION_BENEFITS_POLICY_ID,
	HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
	HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID,
	HUMAN_RESOURCES_COMPENSATION_PAYROLL_HANDOFF_POLICY_ID,
	HUMAN_RESOURCES_COMPENSATION_PROPOSAL_POLICY_ID,
} from "../../../kernel/authorization/authorization-policy-ids";
import type { HumanResourcesAuthorizationPolicy } from "../../../kernel/authorization/authorization-policy-types";
import type { HumanResourcesAuthorizationRequest } from "../../../kernel/authorization/authorization-types";
import {
	HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_PROPOSAL_AMEND,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_PROPOSAL_APPROVE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_PROPOSAL_CREATE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_PROPOSAL_READ,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
	type HumanResourcesPermission,
} from "../../../kernel/authorization/permissions";
import type { HumanResourcesCommandOptions } from "../../../kernel/execution/command-options";
import {
	type CompensationFieldAccessTier,
	partitionCompensationFieldsByTier,
} from "../../../kernel/privacy/field-projection";

type CompensationPolicyDisposition =
	| "benefits"
	| "catalog"
	| "employee"
	| "payroll_handoff"
	| "proposal";

function administrativePermissionsForDisposition(
	disposition: CompensationPolicyDisposition,
): readonly HumanResourcesPermission[] {
	if (disposition === "benefits") {
		return [HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE];
	}
	if (disposition === "proposal") {
		return [
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_PROPOSAL_CREATE,
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_PROPOSAL_AMEND,
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_PROPOSAL_APPROVE,
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_PROPOSAL_READ,
		];
	}
	return [HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE];
}

function isOrganizationScopedCompensationRead(
	request: HumanResourcesAuthorizationRequest,
	disposition: CompensationPolicyDisposition,
): boolean {
	return (
		disposition === "catalog" &&
		request.operationKind === "query" &&
		request.resource?.subjectEmployeeId === undefined
	);
}

async function resolveCompensationTier(
	request: HumanResourcesAuthorizationRequest,
	options: HumanResourcesCommandOptions,
	disposition: CompensationPolicyDisposition,
): Promise<CompensationFieldAccessTier | null> {
	const { resource } = request;
	if (resource === undefined) {
		return null;
	}
	const isHandoff = disposition === "payroll_handoff";
	const isCompensationAdmin =
		isPrivilegedActor(resource) ||
		(await actorHoldsAnyPermission(
			request,
			options,
			administrativePermissionsForDisposition(disposition),
		));
	if (isCompensationAdmin) {
		return isHandoff ? "payroll" : "confidential";
	}
	if (
		isOrganizationScopedCompensationRead(request, disposition) &&
		(await actorHoldsAnyPermission(request, options, [
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
		]))
	) {
		return "confidential";
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

function createCompensationPolicy(
	policyId:
		| typeof HUMAN_RESOURCES_COMPENSATION_BENEFITS_POLICY_ID
		| typeof HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID
		| typeof HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID
		| typeof HUMAN_RESOURCES_COMPENSATION_PAYROLL_HANDOFF_POLICY_ID
		| typeof HUMAN_RESOURCES_COMPENSATION_PROPOSAL_POLICY_ID,
	disposition: CompensationPolicyDisposition,
): HumanResourcesAuthorizationPolicy {
	return {
		id: policyId,
		mode: "specialized",
		resourceRequired: true,
		async evaluate(
			request: HumanResourcesAuthorizationRequest,
			options: HumanResourcesCommandOptions,
		) {
			const { resource } = request;
			if (resource === undefined) {
				return denyAuthorization(
					"resource_context_required",
					`Resource context is required for policy ${policyId}`,
					policyId,
				);
			}

			const tier = await resolveCompensationTier(request, options, disposition);
			if (tier === null) {
				return denyAuthorization(
					"subject_scope_denied",
					disposition === "payroll_handoff"
						? "Managers cannot access payroll handoff data"
						: "Actor is outside the allowed compensation scope",
					policyId,
				);
			}

			if (
				request.operationKind === "command" ||
				request.requestedFields === undefined ||
				request.requestedFields.length === 0
			) {
				return allowAuthorization(policyId);
			}

			return decisionFromProjection({
				policyId,
				projection: partitionCompensationFieldsByTier({
					requestedFields: request.requestedFields,
					tier,
				}),
				denyReason:
					"Actor cannot access any of the requested compensation fields",
			});
		},
	};
}

export const compensationBenefitsPolicy = createCompensationPolicy(
	HUMAN_RESOURCES_COMPENSATION_BENEFITS_POLICY_ID,
	"benefits",
);
export const compensationCatalogPolicy = createCompensationPolicy(
	HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
	"catalog",
);
export const employeeCompensationPolicy = createCompensationPolicy(
	HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID,
	"employee",
);
export const compensationPayrollHandoffPolicy = createCompensationPolicy(
	HUMAN_RESOURCES_COMPENSATION_PAYROLL_HANDOFF_POLICY_ID,
	"payroll_handoff",
);
export const compensationProposalPolicy = createCompensationPolicy(
	HUMAN_RESOURCES_COMPENSATION_PROPOSAL_POLICY_ID,
	"proposal",
);
