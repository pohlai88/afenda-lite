import { fail, ok, type Result } from "@afenda/errors/result";

import { receivablesModuleManifest } from "./module.manifest";
import type { ReceivablesCommandId, ReceivablesQueryId } from "./module-ids";
import type { RECEIVABLES_PERMISSION_CODES } from "./permissions";

export type ReceivablesPermission =
	(typeof RECEIVABLES_PERMISSION_CODES)[number];

export type ReceivablesAuthorizationPort = {
	can(input: {
		organizationId: string;
		actorUserId: string;
		permission: ReceivablesPermission;
	}): Promise<boolean>;
};

async function requirePermission(
	authorization: ReceivablesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: ReceivablesPermission;
	},
): Promise<Result<void>> {
	if (authorization === undefined) {
		return fail("UNAUTHORIZED", "Receivables authorization port is required", {
			permission: input.permission,
		});
	}
	if (!(await authorization.can(input))) {
		return fail("FORBIDDEN", "Missing required receivables permission", {
			permission: input.permission,
		});
	}
	return ok(undefined);
}

export function requireReceivablesCommandPermission(
	authorization: ReceivablesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		command: ReceivablesCommandId;
	},
): Promise<Result<void>> {
	return requirePermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission: receivablesModuleManifest.authorization.commands[input.command],
	});
}

export function requireReceivablesQueryPermission(
	authorization: ReceivablesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		query: ReceivablesQueryId;
	},
): Promise<Result<void>> {
	return requirePermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission: receivablesModuleManifest.authorization.queries[input.query],
	});
}

/** @deprecated Prefer command/query helpers mapped from the module manifest. */
export async function requireReceivablesPermission(
	authorization: ReceivablesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: ReceivablesPermission;
	},
): Promise<Result<void>> {
	return requirePermission(authorization, input);
}
