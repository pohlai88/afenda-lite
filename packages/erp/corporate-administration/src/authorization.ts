import { fail, ok, type Result } from "@afenda/errors/result";

import { corporateAdministrationModuleManifest } from "./module.manifest";
import type { CaCommandId, CaQueryId } from "./module-ids";
import type { CA_PERMISSION_CODES } from "./permissions";

export type CaPermission = (typeof CA_PERMISSION_CODES)[number];

export type CorporateAdministrationAuthorizationPort = {
	can(input: {
		organizationId: string;
		actorUserId: string;
		permission: CaPermission;
	}): Promise<boolean>;
};

export async function requireCaCommandPermission(
	authorization: CorporateAdministrationAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		command: CaCommandId;
	},
): Promise<Result<void>> {
	const permission =
		corporateAdministrationModuleManifest.authorization.commands[input.command];
	return requireCaPermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

export async function requireCaQueryPermission(
	authorization: CorporateAdministrationAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		query: CaQueryId;
	},
): Promise<Result<void>> {
	const permission =
		corporateAdministrationModuleManifest.authorization.queries[input.query];
	return requireCaPermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

async function requireCaPermission(
	authorization: CorporateAdministrationAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: CaPermission;
	},
): Promise<Result<void>> {
	if (!authorization) {
		return fail(
			"UNAUTHORIZED",
			"Corporate Administration authorization port is required",
			{
				permission: input.permission,
			},
		);
	}
	const allowed = await authorization.can(input);
	if (!allowed) {
		return fail(
			"FORBIDDEN",
			"Missing required corporate administration permission",
			{
				permission: input.permission,
			},
		);
	}
	return ok(undefined);
}
