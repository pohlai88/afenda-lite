import { fail, ok, type Result } from "@afenda/errors/result";
import { salesModuleManifest } from "./module.manifest";
import type { SalesCommandId, SalesQueryId } from "./module-ids";
import type { SALES_PERMISSION_CODES } from "./permissions";

export type SalesPermission = (typeof SALES_PERMISSION_CODES)[number];

export type SalesAuthorizationPort = {
	can(input: {
		organizationId: string;
		actorUserId: string;
		permission: SalesPermission;
	}): Promise<boolean>;
};

export async function requireSalesCommandPermission(
	authorization: SalesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		command: SalesCommandId;
	},
): Promise<Result<void>> {
	const permission = salesModuleManifest.authorization.commands[input.command];
	return requireSalesPermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

export async function requireSalesQueryPermission(
	authorization: SalesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		query: SalesQueryId;
	},
): Promise<Result<void>> {
	const permission = salesModuleManifest.authorization.queries[input.query];
	return requireSalesPermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

async function requireSalesPermission(
	authorization: SalesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: SalesPermission;
	},
): Promise<Result<void>> {
	if (!authorization) {
		return fail("UNAUTHORIZED", "Sales authorization port is required", {
			permission: input.permission,
		});
	}
	const allowed = await authorization.can(input);
	if (!allowed) {
		return fail("FORBIDDEN", "Missing required sales permission", {
			permission: input.permission,
		});
	}
	return ok(undefined);
}
