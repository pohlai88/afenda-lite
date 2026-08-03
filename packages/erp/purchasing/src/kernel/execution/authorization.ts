import { errorResult, type Result } from "@afenda/errors";

import type {
	PurchasingCommandId,
	PurchasingQueryId,
} from "../operations/module-ids";
import {
	PURCHASING_COMMAND_AUTHORIZATION,
	PURCHASING_QUERY_AUTHORIZATION,
} from "../operations/registry";
import type { PURCHASING_PERMISSION_CODES } from "./permissions";

export type PurchasingPermission = (typeof PURCHASING_PERMISSION_CODES)[number];

export interface PurchasingAuthorizationPort {
	can: (input: {
		organizationId: string;
		actorUserId: string;
		permission: PurchasingPermission;
	}) => Promise<boolean>;
}

async function requirePermission(
	authorization: PurchasingAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: PurchasingPermission;
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

export function requirePurchasingCommandPermission(
	authorization: PurchasingAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		command: PurchasingCommandId;
	},
): Promise<Result<void>> {
	const permission = PURCHASING_COMMAND_AUTHORIZATION[input.command];
	if (permission === undefined) {
		return Promise.resolve(errorResult.fail("UNAUTHORIZED"));
	}
	return requirePermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

export function requirePurchasingQueryPermission(
	authorization: PurchasingAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		query: PurchasingQueryId;
	},
): Promise<Result<void>> {
	const permission = PURCHASING_QUERY_AUTHORIZATION[input.query];
	if (permission === undefined) {
		return Promise.resolve(errorResult.fail("UNAUTHORIZED"));
	}
	return requirePermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}
