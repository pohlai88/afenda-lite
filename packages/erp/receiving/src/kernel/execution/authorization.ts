import { errorResult, type Result } from "@afenda/errors";

import type {
	ReceivingCommandId,
	ReceivingQueryId,
} from "../operations/module-ids";
import {
	RECEIVING_COMMAND_AUTHORIZATION,
	RECEIVING_QUERY_AUTHORIZATION,
} from "../operations/registry";
import type { RECEIVING_PERMISSION_CODES } from "./permissions";

export type ReceivingPermission = (typeof RECEIVING_PERMISSION_CODES)[number];
export interface ReceivingAuthorizationPort {
	can: (input: {
		organizationId: string;
		actorUserId: string;
		permission: ReceivingPermission;
	}) => Promise<boolean>;
}

async function requirePermission(
	authorization: ReceivingAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: ReceivingPermission;
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

export function requireReceivingCommandPermission(
	authorization: ReceivingAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		command: ReceivingCommandId;
	},
): Promise<Result<void>> {
	const permission = RECEIVING_COMMAND_AUTHORIZATION[input.command];
	if (permission === undefined) {
		return Promise.resolve(errorResult.fail("UNAUTHORIZED"));
	}
	return requirePermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
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
	const permission = RECEIVING_QUERY_AUTHORIZATION[input.query];
	if (permission === undefined) {
		return Promise.resolve(errorResult.fail("UNAUTHORIZED"));
	}
	return requirePermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}
