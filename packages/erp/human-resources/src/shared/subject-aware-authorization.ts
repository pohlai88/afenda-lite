import { fail, ok, type Result } from "@afenda/errors/result";

import type {
	HumanResourcesAuthorizationPort,
	HumanResourcesPermission,
} from "../authorization";
import type { HumanResourcesEmployeeId } from "../brands";
import {
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
	humanResourcesErrorDetails,
} from "../error-codes";
import type {
	HumanResourcesEmployeeIdentity,
	HumanResourcesIdentityResolverPort,
} from "../identity-resolver";
import type { HumanResourcesStore } from "../store";

/** Resolve actor → employee server-side. Never trust a client-supplied employee id alone. */
export async function resolveActorEmployeeIdentity(
	identityResolver: HumanResourcesIdentityResolverPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		asOf?: string;
	},
): Promise<Result<HumanResourcesEmployeeIdentity>> {
	if (!identityResolver) {
		return fail(
			"UNAUTHORIZED",
			"Human Resources identity resolver port is required",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_UNAUTHORIZED),
		);
	}
	const identity = await identityResolver.resolveEmployeeForActor(input);
	if (!identity.ok) return identity;
	if (!identity.data) {
		return fail(
			"FORBIDDEN",
			"Actor is not an employee",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
		);
	}
	return ok(identity.data);
}

export async function requireOwnResourceAccess(
	identityResolver: HumanResourcesIdentityResolverPort,
	authorization: HumanResourcesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		targetEmployeeId: HumanResourcesEmployeeId;
		permission: HumanResourcesPermission;
		asOf?: string;
	},
): Promise<Result<void>> {
	if (!authorization) {
		return fail(
			"UNAUTHORIZED",
			"Human Resources authorization port is required",
		);
	}

	// Check if actor has the permission
	const hasPermission = await authorization.can({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission: input.permission,
	});
	if (!hasPermission) {
		return fail(
			"FORBIDDEN",
			"Missing required human resources permission",
			{
				...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
				permission: input.permission,
			},
		);
	}

	// Resolve actor's employee identity
	const identity = await identityResolver.resolveEmployeeForActor({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		asOf: input.asOf,
	});
	if (!identity.ok) return identity;
	if (!identity.data) {
		return fail(
			"FORBIDDEN",
			"Actor is not an employee",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
		);
	}

	// Verify actor's employee identity matches target
	if (identity.data.employeeId !== input.targetEmployeeId) {
		return fail(
			"FORBIDDEN",
			"Cannot access other employee's resources",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
		);
	}

	return ok(undefined);
}

export async function requireManagerResourceAccess(
	identityResolver: HumanResourcesIdentityResolverPort,
	store: HumanResourcesStore,
	authorization: HumanResourcesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		targetEmployeeId: HumanResourcesEmployeeId;
		permission: HumanResourcesPermission;
		asOf?: string;
	},
): Promise<Result<void>> {
	if (!authorization) {
		return fail(
			"UNAUTHORIZED",
			"Human Resources authorization port is required",
		);
	}

	// Check if actor has the permission
	const hasPermission = await authorization.can({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission: input.permission,
	});
	if (!hasPermission) {
		return fail(
			"FORBIDDEN",
			"Missing required human resources permission",
			{
				...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
				permission: input.permission,
			},
		);
	}

	// Resolve actor's employee identity
	const identity = await identityResolver.resolveEmployeeForActor({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		asOf: input.asOf,
	});
	if (!identity.ok) return identity;
	if (!identity.data) {
		return fail(
			"FORBIDDEN",
			"Actor is not an employee",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
		);
	}

	// Check if actor is the primary manager of the target employee
	const queryDate = input.asOf ?? new Date().toISOString().slice(0, 10);
	const primaryManager = await store.getPrimaryManagerForEmployee({
		organizationId: input.organizationId,
		employeeId: input.targetEmployeeId,
		asOf: queryDate,
	});
	if (!primaryManager.ok) return primaryManager;

	if (
		!primaryManager.data ||
		primaryManager.data !== identity.data.employeeId
	) {
		return fail(
			"FORBIDDEN",
			"Actor is not the manager of the target employee",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
		);
	}

	return ok(undefined);
}

export async function requireAdminResourceAccess(
	authorization: HumanResourcesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: HumanResourcesPermission;
	},
): Promise<Result<void>> {
	if (!authorization) {
		return fail(
			"UNAUTHORIZED",
			"Human Resources authorization port is required",
		);
	}

	const hasPermission = await authorization.can(input);
	if (!hasPermission) {
		return fail(
			"FORBIDDEN",
			"Missing required human resources permission",
			{
				...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
				permission: input.permission,
			},
		);
	}

	return ok(undefined);
}