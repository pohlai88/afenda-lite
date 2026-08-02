import type { HumanResourcesCommandOptions } from "../../command-options";
import {
	HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_REGISTER,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_VERIFY,
	HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ,
	HUMAN_RESOURCES_PERMISSION_WORK_ELIGIBILITY_VERIFY,
} from "../../permissions";
import {
	actorHoldsAnyPermission,
	allowAuthorization,
	decisionFromProjection,
	denyAuthorization,
	isInManagerScope,
	isPrivilegedActor,
	isSubjectEmployee,
	resolveActorPermissions,
} from "../authorization-policy-helpers";
import {
	HUMAN_RESOURCES_COMPLIANCE_ADMIN_POLICY_ID,
	HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_POLICY_ID,
	HUMAN_RESOURCES_WORK_ELIGIBILITY_POLICY_ID,
} from "../authorization-policy-ids";
import type { HumanResourcesAuthorizationPolicy } from "../authorization-policy-types";
import type {
	HumanResourcesAuthorizationRequest,
	HumanResourcesFieldProjection,
} from "../authorization-types";
import {
	PERSONAL_IDENTIFIER_MASK_FIELDS,
	partitionRequestedFieldsBySensitivity,
} from "../field-projection";

const COMPLIANCE_OPERATOR_PERMISSIONS = [
	HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
] as const;

/** Org-wide HR operators for verify/eligibility (not register — see register gate). */
const HR_OPERATOR_PERMISSIONS = [
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_VERIFY,
	HUMAN_RESOURCES_PERMISSION_WORK_ELIGIBILITY_VERIFY,
] as const;

const SUBJECT_COMPLIANCE_PERMISSIONS = [
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_REGISTER,
] as const;

async function canAccessComplianceSubject(
	request: HumanResourcesAuthorizationRequest,
	options: HumanResourcesCommandOptions,
): Promise<boolean> {
	const { resource } = request;
	if (resource === undefined) {
		return false;
	}
	if (isPrivilegedActor(resource)) {
		return true;
	}
	if (
		await actorHoldsAnyPermission(
			request,
			options,
			COMPLIANCE_OPERATOR_PERMISSIONS,
		)
	) {
		return true;
	}
	if (
		await actorHoldsAnyPermission(request, options, HR_OPERATOR_PERMISSIONS)
	) {
		return true;
	}
	// Manifest maps register → own.register; allow that mutation org-wide.
	// Own.register must not grant cross-employee reads/queries.
	if (
		request.operationKind === "command" &&
		request.requiredPermission ===
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_REGISTER &&
		(await actorHoldsAnyPermission(request, options, [
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_REGISTER,
		]))
	) {
		return true;
	}
	if (
		isSubjectEmployee(request.actor, resource) &&
		(await actorHoldsAnyPermission(
			request,
			options,
			SUBJECT_COMPLIANCE_PERMISSIONS,
		))
	) {
		return true;
	}
	if (isInManagerScope(request.actor, resource)) {
		return true;
	}
	return false;
}

async function projectComplianceFields(
	request: HumanResourcesAuthorizationRequest,
	options: HumanResourcesCommandOptions,
): Promise<HumanResourcesFieldProjection | undefined> {
	if (
		request.operationKind === "command" ||
		request.requestedFields === undefined ||
		request.requestedFields.length === 0
	) {
		return;
	}

	const actorPermissions = new Set(resolveActorPermissions(request));
	const canReadSensitiveIdentifiers = await actorHoldsAnyPermission(
		request,
		options,
		[HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ],
	);
	if (canReadSensitiveIdentifiers) {
		actorPermissions.add(
			HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ,
		);
	}

	const base = partitionRequestedFieldsBySensitivity({
		requestedFields: request.requestedFields,
		fieldClasses: ["personal_identifiers"],
		actorPermissions,
	});
	if (canReadSensitiveIdentifiers) {
		return base;
	}

	const denied = new Set(base.deniedFields);
	const allowedFields: string[] = [];
	for (const field of base.allowedFields) {
		if (
			(PERSONAL_IDENTIFIER_MASK_FIELDS as readonly string[]).includes(field)
		) {
			denied.add(field);
		} else {
			allowedFields.push(field);
		}
	}
	return { allowedFields, deniedFields: [...denied] };
}

function createEmployeeCompliancePolicy(
	policyId:
		| typeof HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_POLICY_ID
		| typeof HUMAN_RESOURCES_WORK_ELIGIBILITY_POLICY_ID,
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
					"Resource context is required for employee compliance operations",
					policyId,
				);
			}

			if (!(await canAccessComplianceSubject(request, options))) {
				return denyAuthorization(
					"subject_scope_denied",
					"Actor is outside the allowed compliance subject scope",
					policyId,
				);
			}

			const projection = await projectComplianceFields(request, options);
			if (projection === undefined) {
				return allowAuthorization(policyId);
			}
			return decisionFromProjection({
				policyId,
				projection,
				denyReason:
					"Actor cannot access any of the requested compliance fields",
			});
		},
	};
}

export const complianceAdministrativePolicy: HumanResourcesAuthorizationPolicy =
	{
		id: HUMAN_RESOURCES_COMPLIANCE_ADMIN_POLICY_ID,
		mode: "manifest_only",
		resourceRequired: false,
		evaluate() {
			return Promise.resolve(
				allowAuthorization(HUMAN_RESOURCES_COMPLIANCE_ADMIN_POLICY_ID),
			);
		},
	};

export const employeeDocumentPolicy = createEmployeeCompliancePolicy(
	HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_POLICY_ID,
);

export const workEligibilityPolicy = createEmployeeCompliancePolicy(
	HUMAN_RESOURCES_WORK_ELIGIBILITY_POLICY_ID,
);
