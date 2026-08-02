import type { Result } from "@afenda/errors";
import type { HumanResourcesEmployeeId } from "../brands";
import type {
	HumanResourcesCommandId,
	HumanResourcesQueryId,
} from "../module-ids";
import type { HumanResourcesPermission } from "../permissions";
import type { HumanResourcesResourceKind } from "./authorization-resource-kind";

export type { HumanResourcesResourceKind } from "./authorization-resource-kind";

export interface HumanResourcesAuthorizationPort {
	can: (input: {
		organizationId: string;
		actorUserId: string;
		permission: HumanResourcesPermission;
	}) => Promise<boolean>;
}

export interface HumanResourcesAuthorizationDecisionInput {
	actorUserId: string;
	asOf?: string | undefined;
	organizationId: string;
	ownerEmployeeId?: HumanResourcesEmployeeId | undefined;
	permission: HumanResourcesPermission;
	resourceId?: string | undefined;

	resourceType?: string | undefined;

	sensitivity?: "standard" | "sensitive" | "highly_restricted" | undefined;
	subjectEmployeeId?: HumanResourcesEmployeeId | undefined;
}

export interface HumanResourcesResourceAwareAuthorizationPort {
	canWithContext: (input: HumanResourcesAuthorizationDecisionInput) => Promise<
		Result<{
			allowed: boolean;
			projectedFields?: string[] | undefined;
			reason?: string | undefined;
		}>
	>;
}

export type HumanResourcesOperationId =
	| HumanResourcesCommandId
	| HumanResourcesQueryId;

export type HumanResourcesOperationKind = "command" | "query";

export interface HumanResourcesActorContext {
	actorEmployeeId?: string | undefined;
	actorUserId: string;
	correlationId: string;
	organizationId: string;
}

export interface HumanResourcesResourceContext {
	assignedUserIds?: readonly string[] | undefined;

	/**
	 * Domain-specific attributes. Never put unrestricted row data here.
	 */
	attributes?:
		| Readonly<Record<string, string | number | boolean | null>>
		| undefined;
	kind: HumanResourcesResourceKind;
	managerEmployeeId?: string | undefined;
	organizationId: string;

	/**
	 * Optional policy-relevant relationships.
	 */
	ownerUserId?: string | undefined;
	resourceId?: string | undefined;

	/**
	 * Employee/person affected by the operation.
	 */
	subjectEmployeeId?: string | undefined;
	subjectPersonId?: string | undefined;
}

export interface HumanResourcesAuthorizationRequest {
	actor: HumanResourcesActorContext;
	/**
	 * Full actor permission set for query field projection.
	 * Defaults to `[requiredPermission]` when omitted.
	 */
	actorPermissions?: readonly HumanResourcesPermission[] | undefined;
	operationId: HumanResourcesOperationId;
	operationKind: HumanResourcesOperationKind;
	requestedFields?: readonly string[] | undefined;
	requiredPermission: HumanResourcesPermission;
	resource?: HumanResourcesResourceContext | undefined;
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
			projection?: HumanResourcesFieldProjection | undefined;
	  }
	| {
			allowed: false;
			policyId?: string | undefined;
			code: HumanResourcesAuthorizationDenyCode;
			reason: string;
	  };
