import type { HumanResourcesCommandOptions } from "../command-options";
import type { HumanResourcesPermission } from "../permissions";
import type { HumanResourcesSubjectPolicy } from "../sensitive-operation-policies";
import type {
	HumanResourcesActorContext,
	HumanResourcesAuthorizationDecision,
	HumanResourcesAuthorizationDenyCode,
	HumanResourcesAuthorizationRequest,
	HumanResourcesFieldProjection,
	HumanResourcesResourceContext,
} from "./authorization-types";
import { partitionRequestedFieldsBySensitivity } from "./field-projection";
import { runSequential, sequentialReturn } from "./run-sequential";
import type { HumanResourcesSensitiveFieldClass } from "./sensitive-field-types";

export function denyAuthorization(
	code: HumanResourcesAuthorizationDenyCode,
	reason: string,
	policyId?: string,
): HumanResourcesAuthorizationDecision {
	return policyId === undefined
		? { allowed: false, code, reason }
		: { allowed: false, policyId, code, reason };
}

export function allowAuthorization(
	policyId: string,
	projection?: HumanResourcesFieldProjection,
): HumanResourcesAuthorizationDecision {
	return projection === undefined
		? { allowed: true, policyId }
		: { allowed: true, policyId, projection };
}

export const IN_MANAGER_SCOPE_ATTRIBUTE = "inManagerScope" as const;
export const PRIVILEGED_ACTOR_ATTRIBUTE = "privilegedActor" as const;
export const EXECUTIVE_PLANNER_ATTRIBUTE = "executivePlanner" as const;

export function isPrivilegedActor(
	resource: HumanResourcesResourceContext,
): boolean {
	return resource.attributes?.[PRIVILEGED_ACTOR_ATTRIBUTE] === true;
}

export function isInManagerScope(
	actor: HumanResourcesActorContext,
	resource: HumanResourcesResourceContext,
): boolean {
	if (resource.attributes?.[IN_MANAGER_SCOPE_ATTRIBUTE] === true) {
		return true;
	}
	return (
		actor.actorEmployeeId !== undefined &&
		actor.actorEmployeeId === resource.managerEmployeeId
	);
}

export function isSubjectEmployee(
	actor: HumanResourcesActorContext,
	resource: HumanResourcesResourceContext,
): boolean {
	return (
		actor.actorEmployeeId !== undefined &&
		actor.actorEmployeeId === resource.subjectEmployeeId
	);
}

export function evaluateSubjectScope(input: {
	subjectPolicy: HumanResourcesSubjectPolicy | "manifest_only";
	actor: HumanResourcesActorContext;
	resource: HumanResourcesResourceContext;
}): boolean {
	const { subjectPolicy, actor, resource } = input;
	if (
		subjectPolicy === "manifest_only" ||
		subjectPolicy === "privileged_only"
	) {
		return true;
	}
	if (isPrivilegedActor(resource)) {
		return true;
	}
	switch (subjectPolicy) {
		case "subject_or_privileged":
			return isSubjectEmployee(actor, resource);
		case "manager_or_privileged":
			return isInManagerScope(actor, resource);
		case "subject_manager_or_privileged":
			return (
				isSubjectEmployee(actor, resource) || isInManagerScope(actor, resource)
			);
		case "assigned_or_privileged":
			return (
				resource.assignedUserIds?.includes(actor.actorUserId) === true ||
				resource.ownerUserId === actor.actorUserId
			);
		default: {
			const _exhaustive: never = subjectPolicy;
			return _exhaustive;
		}
	}
}

export function actorHasAnyPermission(
	request: HumanResourcesAuthorizationRequest,
	permissions: readonly HumanResourcesPermission[],
): boolean {
	const actorPermissions = resolveActorPermissions(request);
	return permissions.some((permission) => actorPermissions.has(permission));
}

export async function actorHoldsAnyPermission(
	request: HumanResourcesAuthorizationRequest,
	options: HumanResourcesCommandOptions | undefined,
	permissions: readonly HumanResourcesPermission[],
): Promise<boolean> {
	// Explicit actorPermissions is the complete set for policy evaluation
	// (manifest permission is already gated separately via the auth port).
	if (
		request.actorPermissions !== undefined &&
		request.actorPermissions.length > 0
	) {
		return actorHasAnyPermission(request, permissions);
	}
	if (actorHasAnyPermission(request, permissions)) {
		return true;
	}
	if (options?.authorization === undefined) {
		return false;
	}
	const { authorization } = options;
	const sequentialOutcome1 = await runSequential(
		permissions,
		async (permission) => {
			const allowed = await authorization.can({
				organizationId: request.actor.organizationId,
				actorUserId: request.actor.actorUserId,
				permission,
			});
			if (allowed) {
				return sequentialReturn(true);
			}
		},
	);
	if (sequentialOutcome1.kind === "return") {
		return sequentialOutcome1.value;
	}
	return false;
}

export async function requirePrivilegedAccess(input: {
	request: HumanResourcesAuthorizationRequest;
	policyId: string;
	privilegedPermissions: readonly HumanResourcesPermission[];
	options?: HumanResourcesCommandOptions | undefined;
}): Promise<HumanResourcesAuthorizationDecision | null> {
	const { request, policyId, privilegedPermissions, options } = input;
	const { resource } = request;
	if (resource !== undefined && isPrivilegedActor(resource)) {
		return null;
	}
	if (await actorHoldsAnyPermission(request, options, privilegedPermissions)) {
		return null;
	}
	return denyAuthorization(
		"subject_scope_denied",
		`Privileged access is required for policy ${policyId}`,
		policyId,
	);
}

export function resolveActorPermissions(
	request: HumanResourcesAuthorizationRequest,
): ReadonlySet<HumanResourcesPermission> {
	if (
		request.actorPermissions !== undefined &&
		request.actorPermissions.length > 0
	) {
		return new Set(request.actorPermissions);
	}
	return new Set([request.requiredPermission]);
}

/**
 * Allow with optional projection, or deny when every requested field was denied.
 */
export function decisionFromProjection(input: {
	policyId: string;
	projection: HumanResourcesFieldProjection;
	denyReason?: string | undefined;
}): HumanResourcesAuthorizationDecision {
	const { policyId, projection } = input;
	if (
		projection.deniedFields.length > 0 &&
		projection.allowedFields.length === 0
	) {
		return denyAuthorization(
			"field_access_denied",
			input.denyReason ?? "Actor cannot access any of the requested fields",
			policyId,
		);
	}
	return allowAuthorization(policyId, projection);
}

export function projectQueryFields(input: {
	request: HumanResourcesAuthorizationRequest;
	policyId: string;
	fieldClasses: readonly HumanResourcesSensitiveFieldClass[];
}): HumanResourcesAuthorizationDecision {
	const { request, policyId, fieldClasses } = input;
	if (request.operationKind === "command") {
		return allowAuthorization(policyId);
	}
	if (
		request.requestedFields === undefined ||
		request.requestedFields.length === 0
	) {
		return allowAuthorization(policyId);
	}
	return decisionFromProjection({
		policyId,
		projection: partitionRequestedFieldsBySensitivity({
			requestedFields: request.requestedFields,
			fieldClasses,
			actorPermissions: resolveActorPermissions(request),
		}),
	});
}
