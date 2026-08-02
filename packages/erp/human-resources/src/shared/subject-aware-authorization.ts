import { errorResult, type Result } from "@afenda/errors";
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
import type { HumanResourcesPermission } from "../permissions";
import type { HumanResourcesLeaveStore } from "../store/leave";
import type { HumanResourcesAuthorizationPort } from "./authorization-types";
import { requireHumanResourcesManifestPermission } from "./contextual-authorization";

function commandOptions(input: {
	authorization?: HumanResourcesAuthorizationPort | undefined;
}): { authorization?: HumanResourcesAuthorizationPort } {
	return input.authorization === undefined
		? {}
		: { authorization: input.authorization };
}

function actorIdentityInput(input: {
	organizationId: string;
	actorUserId: string;
	asOf?: string | undefined;
}): { organizationId: string; actorUserId: string; asOf?: string } {
	return {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		...(input.asOf === undefined ? {} : { asOf: input.asOf }),
	};
}

/** Resolve actor → employee server-side. Never trust a client-supplied employee id alone. */
export async function resolveActorEmployeeIdentity(
	identityResolver: HumanResourcesIdentityResolverPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		asOf?: string | undefined;
	},
): Promise<Result<HumanResourcesEmployeeIdentity>> {
	if (!identityResolver) {
		return errorResult.fail("UNAUTHORIZED", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
			),
		});
	}
	const identity = await identityResolver.resolveEmployeeForActor(
		actorIdentityInput(input),
	);
	if (!identity.ok) {
		return identity;
	}
	if (!identity.data) {
		return errorResult.fail("FORBIDDEN", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			),
		});
	}
	return errorResult.ok(identity.data);
}

export async function requireOwnResourceAccess(
	identityResolver: HumanResourcesIdentityResolverPort,
	options: {
		authorization?: HumanResourcesAuthorizationPort | undefined;
	},
	input: {
		organizationId: string;
		actorUserId: string;
		targetEmployeeId: HumanResourcesEmployeeId;
		permission: HumanResourcesPermission;
		asOf?: string | undefined;
	},
): Promise<Result<void>> {
	const permissionCheck = await requireHumanResourcesManifestPermission(
		commandOptions(options),
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			permission: input.permission,
		},
	);
	if (!permissionCheck.ok) {
		return permissionCheck;
	}

	// Resolve actor's employee identity
	const identity = await identityResolver.resolveEmployeeForActor(
		actorIdentityInput(input),
	);
	if (!identity.ok) {
		return identity;
	}
	if (!identity.data) {
		return errorResult.fail("FORBIDDEN", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			),
		});
	}

	// Verify actor's employee identity matches target
	if (identity.data.employeeId !== input.targetEmployeeId) {
		return errorResult.fail("FORBIDDEN", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			),
		});
	}

	return errorResult.ok(undefined);
}

export async function requireManagerResourceAccess(
	identityResolver: HumanResourcesIdentityResolverPort,
	store: Pick<HumanResourcesLeaveStore, "getPrimaryManagerForEmployee">,
	options: {
		authorization?: HumanResourcesAuthorizationPort | undefined;
	},
	input: {
		organizationId: string;
		actorUserId: string;
		targetEmployeeId: HumanResourcesEmployeeId;
		permission: HumanResourcesPermission;
		asOf?: string | undefined;
	},
): Promise<Result<void>> {
	const permissionCheck = await requireHumanResourcesManifestPermission(
		commandOptions(options),
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			permission: input.permission,
		},
	);
	if (!permissionCheck.ok) {
		return permissionCheck;
	}

	// Resolve actor's employee identity
	const identity = await identityResolver.resolveEmployeeForActor(
		actorIdentityInput(input),
	);
	if (!identity.ok) {
		return identity;
	}
	if (!identity.data) {
		return errorResult.fail("FORBIDDEN", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			),
		});
	}

	// Check if actor is the primary manager of the target employee
	const queryDate = input.asOf ?? new Date().toISOString().slice(0, 10);
	const primaryManager = await store.getPrimaryManagerForEmployee({
		organizationId: input.organizationId,
		employeeId: input.targetEmployeeId,
		asOf: queryDate,
	});
	if (!primaryManager.ok) {
		return primaryManager;
	}

	if (
		!primaryManager.data ||
		primaryManager.data !== identity.data.employeeId
	) {
		return errorResult.fail("FORBIDDEN", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			),
		});
	}

	return errorResult.ok(undefined);
}

export async function requireAdminResourceAccess(
	options: {
		authorization?: HumanResourcesAuthorizationPort | undefined;
	},
	input: {
		organizationId: string;
		actorUserId: string;
		permission: HumanResourcesPermission;
	},
): Promise<Result<void>> {
	return await requireHumanResourcesManifestPermission(
		commandOptions(options),
		input,
	);
}
