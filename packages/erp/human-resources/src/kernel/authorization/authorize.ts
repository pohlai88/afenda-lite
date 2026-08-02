import { errorResult, type Result } from "@afenda/errors";
import { humanResourcesModuleManifest } from "../../composition/module.manifest";
import {
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
	humanResourcesErrorDetails,
} from "../execution/error-codes";
import type {
	HumanResourcesCommandId,
	HumanResourcesQueryId,
} from "../operations/module-ids";
import type {
	HumanResourcesAuthorizationDecisionInput,
	HumanResourcesAuthorizationPort,
	HumanResourcesResourceAwareAuthorizationPort,
} from "./authorization-types";
import type { HumanResourcesPermission } from "./permissions";

export type {
	HumanResourcesAuthorizationDecisionInput,
	HumanResourcesAuthorizationPort,
	HumanResourcesResourceAwareAuthorizationPort,
} from "./authorization-types";
export type { HumanResourcesPermission } from "./permissions";

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
		return errorResult.fail("UNAUTHORIZED", {
			internalContext: {
				...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_UNAUTHORIZED),
				permission: input.permission,
			},
		});
	}
	const allowed = await authorization.can(input);
	if (!allowed) {
		return errorResult.fail("FORBIDDEN", {
			internalContext: {
				...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
				permission: input.permission,
			},
		});
	}
	return errorResult.ok(undefined);
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
		return errorResult.fail("UNAUTHORIZED", {
			internalContext: {
				...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_UNAUTHORIZED),
				permission: input.permission,
			},
		});
	}

	const result = await resourceAwareAuthorization.canWithContext(input);
	if (!result.ok) {
		return result;
	}

	if (!result.data.allowed) {
		return errorResult.fail("FORBIDDEN", {
			internalContext: {
				...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
				permission: input.permission,
			},
		});
	}

	return errorResult.ok(result.data);
}
