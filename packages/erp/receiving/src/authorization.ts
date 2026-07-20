import { fail, ok, type Result } from "@afenda/errors/result";
import { receivingModuleManifest } from "./module.manifest";
import type { ReceivingCommandId, ReceivingQueryId } from "./module-ids";
import type { RECEIVING_PERMISSION_CODES } from "./permissions";

export type ReceivingPermission = (typeof RECEIVING_PERMISSION_CODES)[number];
export type ReceivingAuthorizationPort = {
	can(input: {
		organizationId: string;
		actorUserId: string;
		permission: ReceivingPermission;
	}): Promise<boolean>;
};

async function requirePermission(
	authorization: ReceivingAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: ReceivingPermission;
	},
): Promise<Result<void>> {
	if (authorization === undefined) {
		return fail("UNAUTHORIZED", "Receiving authorization port is required", {
			permission: input.permission,
		});
	}
	if (!(await authorization.can(input))) {
		return fail("FORBIDDEN", "Missing required receiving permission", {
			permission: input.permission,
		});
	}
	return ok(undefined);
}

export function requireReceivingCommandPermission(
	authorization: ReceivingAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		command: ReceivingCommandId;
	},
): Promise<Result<void>> {
	return requirePermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission: receivingModuleManifest.authorization.commands[input.command],
	});
}

export function requireReceivingQueryPermission(
	authorization: ReceivingAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		query: ReceivingQueryId;
	},
): Promise<Result<void>> {
	return requirePermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission: receivingModuleManifest.authorization.queries[input.query],
	});
}
