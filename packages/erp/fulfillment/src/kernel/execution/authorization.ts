import { errorResult, type Result } from "@afenda/errors";

import type {
	FulfillmentCommandId,
	FulfillmentQueryId,
} from "../operations/module-ids";
import {
	FULFILLMENT_COMMAND_AUTHORIZATION,
	FULFILLMENT_QUERY_AUTHORIZATION,
} from "../operations/registry";
import type { FULFILLMENT_PERMISSION_CODES } from "./permissions";

export type FulfillmentPermission =
	(typeof FULFILLMENT_PERMISSION_CODES)[number];
export interface FulfillmentAuthorizationPort {
	can: (input: {
		organizationId: string;
		actorUserId: string;
		permission: FulfillmentPermission;
	}) => Promise<boolean>;
}

async function requirePermission(
	authorization: FulfillmentAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: FulfillmentPermission;
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

export function requireFulfillmentCommandPermission(
	authorization: FulfillmentAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		command: FulfillmentCommandId;
	},
): Promise<Result<void>> {
	const permission = FULFILLMENT_COMMAND_AUTHORIZATION[input.command];
	if (permission === undefined) {
		return Promise.resolve(errorResult.fail("UNAUTHORIZED"));
	}
	return requirePermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

export function requireFulfillmentQueryPermission(
	authorization: FulfillmentAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		query: FulfillmentQueryId;
	},
): Promise<Result<void>> {
	const permission = FULFILLMENT_QUERY_AUTHORIZATION[input.query];
	if (permission === undefined) {
		return Promise.resolve(errorResult.fail("UNAUTHORIZED"));
	}
	return requirePermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}
