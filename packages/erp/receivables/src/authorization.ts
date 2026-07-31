import { errorResult, type Result } from "@afenda/errors";

import { receivablesModuleManifest } from "./module.manifest";
import type { ReceivablesCommandId, ReceivablesQueryId } from "./module-ids";
import type { RECEIVABLES_PERMISSION_CODES } from "./permissions";

export type ReceivablesPermission =
	(typeof RECEIVABLES_PERMISSION_CODES)[number];

export interface ReceivablesAuthorizationPort {
	can: (input: {
		organizationId: string;
		actorUserId: string;
		permission: ReceivablesPermission;
	}) => Promise<boolean>;
}

async function requirePermission(
	authorization: ReceivablesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: ReceivablesPermission;
	},
): Promise<Result<void>> {
	if (authorization === undefined) {
		return errorResult.fail("UNAUTHORIZED");
	}
	if (!(await authorization.can(input))) {
		return errorResult.fail("FORBIDDEN");
	}
	return errorResult.ok(undefined);
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
