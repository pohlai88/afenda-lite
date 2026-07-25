import type { Result } from "@afenda/errors/result";
import type { HumanResourcesEmployeeId } from "../brands";
import type {
	HumanResourcesCommandId,
	HumanResourcesQueryId,
} from "../module-ids";
import type { HumanResourcesPermission } from "../permissions";

export type HumanResourcesAuthorizationPort = {
	can(input: {
		organizationId: string;
		actorUserId: string;
		permission: HumanResourcesPermission;
	}): Promise<boolean>;
};

export type HumanResourcesAuthorizationDecisionInput = {
	organizationId: string;
	actorUserId: string;
	permission: HumanResourcesPermission;

	resourceType?: string;
	resourceId?: string;
	subjectEmployeeId?: HumanResourcesEmployeeId;
	ownerEmployeeId?: HumanResourcesEmployeeId;

	sensitivity?: "standard" | "sensitive" | "highly_restricted";
	asOf?: string;
};

export type HumanResourcesResourceAwareAuthorizationPort = {
	canWithContext(input: HumanResourcesAuthorizationDecisionInput): Promise<
		Result<{
			allowed: boolean;
			projectedFields?: string[];
			reason?: string;
		}>
	>;
};

export type HumanResourcesOperationId =
	| HumanResourcesCommandId
	| HumanResourcesQueryId;

export type HumanResourcesOperationKind = "command" | "query";

export type HumanResourcesResourceKind =
	| "person"
	| "worker"
	| "employee"
	| "employment"
	| "assignment"
	| "candidate"
	| "interview"
	| "offer"
	| "leave_request"
	| "timesheet"
	| "overtime_request"
	| "compensation"
	| "performance_review"
	| "employee_case"
	| "employee_document"
	| "work_eligibility"
	| "competency_assessment"
	| "talent_profile"
	| "succession_plan"
	| "headcount_plan"
	| "privacy_subject";

export interface HumanResourcesActorContext {
	organizationId: string;
	actorUserId: string;
	actorEmployeeId?: string;
	correlationId: string;
}

export interface HumanResourcesResourceContext {
	organizationId: string;
	kind: HumanResourcesResourceKind;
	resourceId?: string;

	/**
	 * Employee/person affected by the operation.
	 */
	subjectEmployeeId?: string;
	subjectPersonId?: string;

	/**
	 * Optional policy-relevant relationships.
	 */
	ownerUserId?: string;
	managerEmployeeId?: string;
	assignedUserIds?: readonly string[];

	/**
	 * Domain-specific attributes. Never put unrestricted row data here.
	 */
	attributes?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface HumanResourcesAuthorizationRequest {
	operationId: HumanResourcesOperationId;
	operationKind: HumanResourcesOperationKind;
	requiredPermission: HumanResourcesPermission;
	actor: HumanResourcesActorContext;
	resource?: HumanResourcesResourceContext;
	requestedFields?: readonly string[];
	/**
	 * Full actor permission set for query field projection.
	 * Defaults to `[requiredPermission]` when omitted.
	 */
	actorPermissions?: readonly HumanResourcesPermission[];
}

export type HumanResourcesAuthorizationDenyCode =
	| "permission_denied"
	| "cross_tenant"
	| "resource_context_required"
	| "subject_scope_denied"
	| "policy_not_registered"
	| "ambiguous_policy"
	| "field_access_denied";

export interface HumanResourcesFieldProjection {
	allowedFields: readonly string[];
	deniedFields: readonly string[];
}

export type HumanResourcesAuthorizationDecision =
	| {
			allowed: true;
			policyId: string;
			projection?: HumanResourcesFieldProjection;
	  }
	| {
			allowed: false;
			policyId?: string;
			code: HumanResourcesAuthorizationDenyCode;
			reason: string;
	  };
