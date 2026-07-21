import { fail, ok, type Result } from "@afenda/errors/result";

import { humanResourcesModuleManifest } from "./module.manifest";
import type {
	HumanResourcesCommandId,
	HumanResourcesQueryId,
} from "./module-ids";
import type { HUMAN_RESOURCES_PERMISSION_CODES } from "./permissions";

export type HumanResourcesPermission =
	(typeof HUMAN_RESOURCES_PERMISSION_CODES)[number];

export type HumanResourcesAuthorizationPort = {
	can(input: {
		organizationId: string;
		actorUserId: string;
		permission: HumanResourcesPermission;
	}): Promise<boolean>;
};

export async function requireHumanResourcesCommandPermission(
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

export async function requireHumanResourcesQueryPermission(
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

async function requireHumanResourcesPermission(
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
				permission: input.permission,
			},
		);
	}
	const allowed = await authorization.can(input);
	if (!allowed) {
		return fail("FORBIDDEN", "Missing required human resources permission", {
			permission: input.permission,
		});
	}
	return ok(undefined);
}
