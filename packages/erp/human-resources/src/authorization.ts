import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
	humanResourcesErrorDetails,
} from "./error-codes";
import { humanResourcesModuleManifest } from "./module.manifest";
import type {
	HumanResourcesCommandId,
	HumanResourcesQueryId,
} from "./module-ids";
import type { HumanResourcesPermission } from "./permissions";
import type {
	HumanResourcesAuthorizationDecisionInput,
	HumanResourcesAuthorizationPort,
	HumanResourcesResourceAwareAuthorizationPort,
} from "./shared/authorization-types";

export type { HumanResourcesPermission } from "./permissions";
export type {
	HumanResourcesAuthorizationDecisionInput,
	HumanResourcesAuthorizationPort,
	HumanResourcesResourceAwareAuthorizationPort,
} from "./shared/authorization-types";

export function requireHumanResourcesCommandPermission(
	authorization: HumanResourcesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		command: HumanResourcesCommandId;
	},
): Promise<Result<void>> {
	const permission =
		humanResourcesModuleManifest.authorization.commands[input.command];
	return requireHumanResourcesPermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

export function requireHumanResourcesQueryPermission(
	authorization: HumanResourcesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		query: HumanResourcesQueryId;
	},
): Promise<Result<void>> {
	const permission =
		humanResourcesModuleManifest.authorization.queries[input.query];
	return requireHumanResourcesPermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

export async function requireHumanResourcesPermission(
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
			{
				...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_UNAUTHORIZED),
				permission: input.permission,
			},
		);
	}
	const allowed = await authorization.can(input);
	if (!allowed) {
		return fail("FORBIDDEN", "Missing required human resources permission", {
			...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
			permission: input.permission,
		});
	}
	return ok(undefined);
}

export async function requireHumanResourcesResourceAwarePermission(
	resourceAwareAuthorization:
		| HumanResourcesResourceAwareAuthorizationPort
		| undefined,
	input: HumanResourcesAuthorizationDecisionInput,
): Promise<
	Result<{
		allowed: boolean;
		projectedFields?: string[] | undefined;
		reason?: string | undefined;
	}>
> {
	if (!resourceAwareAuthorization) {
		return fail(
			"UNAUTHORIZED",
			"Human Resources resource-aware authorization port is required",
			{
				...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_UNAUTHORIZED),
				permission: input.permission,
			},
		);
	}

	const result = await resourceAwareAuthorization.canWithContext(input);
	if (!result.ok) {
		return result;
	}

	if (!result.data.allowed) {
		return fail("FORBIDDEN", result.data.reason || "Access denied", {
			...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
			permission: input.permission,
		});
	}

	return ok(result.data);
}
